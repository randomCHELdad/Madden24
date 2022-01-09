const EventEmitter = require('events').EventEmitter;
const utilService = require('./services/utilService');
const FranchiseFileRecord = require('./FranchiseFileRecord');

class FranchiseFileTable extends EventEmitter {
  constructor(data, offset, gameYear, strategy) {
    super();
    this.index = -1;
    this.data = data;
    this.lengthAtLastSave = data.length;
    this.offset = offset;
    this.strategyBase = strategy;
    this.strategy = this.strategyBase.table;
    this.recordsRead = false;
    this._gameYear = gameYear; 
    this.header = this.strategy.parseHeader(this.data);
    this.name = this.header.name;
    this.isArray = this.header.isArray;
    this.loadedOffsets = [];
    this.isChanged = false;
    this.records = [];
    this.table2Records = [];
    this.arraySizes = [];
    this.emptyRecords = new Map();
  };

  get hexData () {
    this.updateBuffer();
    return this.data;
  };

  set schema (schema) {
    // console.time('set schema');
    this._schema = schema;
    const modifiedHeaderAttributes = this.strategy.parseHeaderAttributesFromSchema(schema, this.data, this.header);

    this.header.headerSize = modifiedHeaderAttributes.headerSize;
    this.header.record1Size = modifiedHeaderAttributes.record1Size;
    this.header.table1StartIndex = modifiedHeaderAttributes.table1StartIndex;
    this.header.table2StartIndex = modifiedHeaderAttributes.table2StartIndex;
    // console.timeEnd('set schema');
  };

  get schema () {
    return this._schema;
  };
  
  updateBuffer() {
    // need to check table2 data first because it may change offsets of the legit records.
    const table2Data = this.strategy.getTable2BinaryData(this.table2Records, this.data.slice(this.header.table2StartIndex));

    const changedRecords = this.records.filter((record) => { return record.isChanged; });
    let currentOffset = 0;
    let bufferArrays = [];

    // Add all of the array sizes to the buffer if the table is an array and had a change
    if (this.isArray && changedRecords.length > 0) {
      // Push the header data
      bufferArrays.push(this.data.slice(currentOffset, this.header.headerSize));

      let arraySizeBuffer = Buffer.alloc(this.header.data1RecordCount * 4);

      this.arraySizes.forEach((arraySize, index) => {
        arraySizeBuffer.writeUInt32BE(arraySize, (index * 4));
      });

      bufferArrays.push(arraySizeBuffer);
      currentOffset += this.header.headerSize + this.header.data1RecordCount * 4;
    }

    for (let i = 0; i < changedRecords.length; i++) {
      let record = changedRecords[i];
      record.isChanged = false;
      const recordOffset = this.header.table1StartIndex + (record.index * this.header.record1Size);
      
      bufferArrays.push(this.data.slice(currentOffset, recordOffset));
      const recordHexData = record.hexData;
      bufferArrays.push(recordHexData);
      currentOffset = recordOffset + recordHexData.length;
    }

    bufferArrays.push(this.data.slice(currentOffset, this.header.table2StartIndex));
    bufferArrays = bufferArrays.concat(table2Data);

    this.data = Buffer.concat(bufferArrays);
  };

  setNextRecordToUse(index, resetEmptyRecordMap) {
    this._setNextRecordToUseBuffer(index);

    // Recalculate the empty record map if the option is set and the
    // records have already been read.
    if (resetEmptyRecordMap && this.recordsRead) {
      this.updateBuffer();
      this.emptyRecords = this._parseEmptyRecords();
    }

    this.emit('change');
  };

  _setNextRecordToUseBuffer(index) {
    // We need to update the table header to use this row next
    this.header.nextRecordToUse = index;

    // And finally update the buffer to reflect this change
    this.data.writeUInt32BE(index, this.header.offsetStart - 4);
  };

  recalculateEmptyRecordReferences() {
    // For this method, we are not going to assume any existing empty records.
    // We're going through each record and checking if it is an empty reference.
    // If so, we'll add it to the list. At the end we will check if there are any unreachable empty references
    // and update those accordingly.
    let emptyRecordReferenceIndicies = [];

    this.records.forEach((record) => {
      let isEmptyReference = false;
      const firstFourBytesReference = utilService.getReferenceData(record._data.slice(0, 32));

      if (firstFourBytesReference.tableId === 0 && firstFourBytesReference.rowNumber !== 0) {
        // Could be a an empty record reference or a table2 field.
        // Check for a table2 field reference.
        const firstOffset = this.offsetTable[0];
        if (firstOffset.type !== 'string') {
          isEmptyReference = true;

          // Save the row number that this record points to.
          emptyRecordReferenceIndicies.push(firstFourBytesReference.rowNumber);
        }
      }

      record.isEmpty = isEmptyReference;
    });

    // We need to determine the starting node.
    // To do that, we need to find the empty record which no other empty record points to.
    const unreachableRecords = this.records.filter((record) => { return record.isEmpty; }).filter((record) => {
      return emptyRecordReferenceIndicies.indexOf(record.index) === -1;
    });

    // If there are more than 1 nodes which are not referenced, there is an issue
    if (unreachableRecords.length > 1) {
      const unreachableIndicies = unreachableRecords.map((record) => {
        return record.index;
      });

      console.warn(`(${this.header.tableId}) ${this.name} - More than one unreachable records found: `
      + `(${unreachableIndicies.join(', ')}). The game will most likely crash if you do not fix this problem. `
      + `The nextRecordToUse has NOT been updated.`);
    }
    else {
      let nextRecordToUse = this.header.recordCapacity;

      if (unreachableRecords.length === 1) {
        nextRecordToUse = unreachableRecords[0].index;
      }

      this._setNextRecordToUseBuffer(nextRecordToUse);
      this.emptyRecords = this._parseEmptyRecords();
      this.emit('change');
    }
  };

  async replaceRawData(buf, shouldReadRecords) {
    this.data = buf;

    // Reset fields
    this.recordsRead = false;
    this.header = this.strategy.parseHeader(this.data);
    this.name = this.header.name;
    this.isArray = this.header.isArray;
    this.loadedOffsets = [];
    this.isChanged = false;
    this.records = [];
    this.table2Records = [];
    this.arraySizes = [];
    this.emptyRecords = new Map();

    this.emit('change');

    // Re-read records if desired
    if (shouldReadRecords) {
      return this.readRecords();
    }
  };

  // attribsToLoad is an array of attribute names (strings) to load. It is optional - if nothing is provided to the function it will load all attributes.
  readRecords (attribsToLoad) {
    return new Promise((resolve, reject) => {
      if (!this.recordsRead || isLoadingNewOffsets(this.loadedOffsets, attribsToLoad, this.offsetTable)) {
        if (this.schema) {
          this.offsetTable = readOffsetTable(this.data, this.schema, this.header);
        } else if (this.isArray) {
          const numberOfFields = this.header.record1Size / 4;
          let offsetTable = [];
          let arraySizes = [];

          for (let i = 0; i < numberOfFields; i++) {
            const offset = {
              'final': false,
              'index': i,
              'indexOffset': i * 32,
              'isSigned': false,
              'length': 32,
              'maxLength': null,
              'maxValue': null,
              'minValue': null,
              'name': `${this.name.substring(0, this.name.length - 2)}${i}`,
              'offset': i * 32,
              'type': this.name.substring(0, this.name.length - 2),
              'valueInSecondTable': false
            }
            
            offset.isReference = !offset.enum && (offset.type[0] == offset.type[0].toUpperCase() || offset.type.includes('[]')) ? true : false,

            offsetTable.push(offset);
          }

          for (let i = 0; i < this.header.data1RecordCount; i++) {
            arraySizes.push(this.data.readUInt32BE(this.header.headerSize + (i * 4)));
          }

          this.offsetTable = offsetTable;
          this.arraySizes = arraySizes;
        } else {
          reject('Cannot read records: Schema is not defined.');
        }
        
        
        let offsetTableToUse = this.offsetTable;
        const mandatoryOffsetsToLoad = this.strategy.getMandatoryOffsets(this.offsetTable);
        
        if (attribsToLoad) {
          // get any new attributes to load plus the existing loaded offsets
          offsetTableToUse = offsetTableToUse.filter((attrib) => { 
            return mandatoryOffsetsToLoad.includes(attrib.name)
            || attribsToLoad.includes(attrib.name) 
            || this.loadedOffsets.find((offset) => { return offset.name === attrib.name; }); 
          });
        }
        
        this.loadedOffsets = offsetTableToUse;
        this.records = readRecords(this.data, this.header, offsetTableToUse);
        
        if (this.header.hasSecondTable) {
          this._parseTable2Values(this.data, this.header, this.records);
        }

        this.emptyRecords = this._parseEmptyRecords();

        this.records.forEach((record, index) => {
          if (this.isArray) {
            record.arraySize = this.arraySizes[index];
          }

          if (this.emptyRecords.get(index)) {
            record.isEmpty = true;
          }

          const that = this;

          record.on('change', function (changedOffset) {
            this.isChanged = true;

            if (that.isArray) {
              that.arraySizes[index] = this.arraySize;
            }

            // When a record changes, we need to check if it was previously empty
            // If so, we need to consider the record as no longer empty
            // So we need to adjust the empty records

            // First, check if the record's length is greater than 4 bytes (32 bits)
            // If less than 4 bytes, it can never become empty...probably. :)
            if (that.header.record1Size >= 4) {
              
              // Ex: Empty record list looks like this: A -> B -> C
              // When B's value is changed, the records need updated to: A -> C
              const emptyRecordReference = that.emptyRecords.get(this.index);
              const changedRecordWasEmpty = emptyRecordReference !== null && emptyRecordReference !== undefined;
  
              if (changedRecordWasEmpty) {
                // Check if the record's first four bytes still have a reference to the 0th table.
                // If so, then the record is still considered empty.
                
                // We need to check the buffer because the first field is not always a reference.
                const referenceData = utilService.getReferenceData(this._data.slice(0, 32));
                if (referenceData.tableId !== 0) {

                  // Delete the empty record entry because it is no longer empty
                  that.emptyRecords.delete(this.index);
    
                  // Set the isEmpty back to false because it's no longer empty
                  this.isEmpty = false;
    
                  // Check if there is a previous empty record
                  const previousEmptyReference = that.emptyRecords.get(emptyRecordReference.previous);
    
                  if (previousEmptyReference) {
                    // Set the previous empty record to point to the old reference's next node
                    that.emptyRecords.set(emptyRecordReference.previous, {
                      previous: that.emptyRecords.get(emptyRecordReference.previous).previous,
                      next: emptyRecordReference.next
                    });
    
                    // change the table buffer and record buffer to reflect this change
                    changeRecordBuffers(emptyRecordReference.previous, emptyRecordReference.next);
                  }
    
                  // If there is a next empty reference, update the previous value accordingly to now point
                  // to the current record's previous index.
                  const nextEmptyReference = that.emptyRecords.get(emptyRecordReference.next);
    
                  if (nextEmptyReference) {
                    that.emptyRecords.set(emptyRecordReference.next, {
                      previous: emptyRecordReference.previous,
                      next: that.emptyRecords.get(emptyRecordReference.next).next
                    });
    
                    if (!previousEmptyReference) {
                      // If no previous empty record exists and a next record exists, we need to update the header to
                      // point to this record as the next record to use.
                      that.setNextRecordToUse(emptyRecordReference.next);
                    }
                  }
    
                  // If there are no previous or next empty references
                  // Then there are no more empty references in the table
                  // Update the table header nextRecordToUse back to the table record capacity
                  if (!previousEmptyReference && !nextEmptyReference) {
                    that.setNextRecordToUse(that.header.recordCapacity);
                  }
                }
              }
            }

            that.emit('change');
          });

          record.on('empty', function () {
            onRecordEmpty(this);
          });

          function onRecordEmpty(record) {
            // First, check if the record is already empty. If so, don't do anything...
            // If not empty, then we need to empty it.
            if (!record.isEmpty) {
              record.isChanged = true;
              const lastEmptyRecordMapEntry = Array.from(that.emptyRecords).pop();
  
              // When we empty a record, we need to check if another empty record exists in the table.
              if (lastEmptyRecordMapEntry !== null && lastEmptyRecordMapEntry !== undefined) {
  
                // If an empty record already exists, we just need to get the last empty record
                // and update its index to point to the current record that we want to empty.
                const lastEmptyRecordIndex = lastEmptyRecordMapEntry[0];
  
                that.emptyRecords.set(lastEmptyRecordIndex, {
                  previous: lastEmptyRecordMapEntry[1].previous,
                  next: record.index
                });
  
                // Then we need to update the current record index to point to the record capacity.
                that.emptyRecords.set(record.index, {
                  previous: lastEmptyRecordIndex,
                  next: that.header.recordCapacity
                });
  
                // Finally, we need to update the buffers to reflect this data.
                // First, place the new referenced index (will be the first 4 bytes)
                // Next, fill the rest of the record with 0s (the last bytes of the record)
  
                // And update both record's data. This will set the unformatted and formatted values
                // without emitting an event
                changeRecordBuffers(lastEmptyRecordIndex, record.index);
                changeRecordBuffers(record.index, that.header.recordCapacity);
              }
              else {
                // In this case, the record that was emptied is the first empty record in the table
                that.emptyRecords.set(record.index, {
                  previous: null,
                  next: that.header.recordCapacity
                });
  
                // Finally update the table header and buffer so that the game uses this new empty
                // record as the next record to use (or fill)
                that.setNextRecordToUse(record.index);
                changeRecordBuffers(record.index, that.header.recordCapacity);
              }
              
              that.emit('change');
            }
          };

          function changeRecordBuffers(index, emptyRecordReference) {
            setBufferToEmptyRecordReference(index, emptyRecordReference);
            setRecordInternalBuffer(index, emptyRecordReference);
          };

          function setBufferToEmptyRecordReference(index, emptyRecordReference) {
            const recordStartIndex = that.header.table1StartIndex + (index * that.header.record1Size)
            that.data.writeUInt32BE(emptyRecordReference, recordStartIndex);
            // that.data.fill(0, recordStartIndex + 4, recordStartIndex + that.header.record1Size);
          };

          function setRecordInternalBuffer(index, emptyRecordReference) {
            let newData = utilService.dec2bin(emptyRecordReference, 32);

            const recordSizeInBits = that.header.record1Size * 8;
            if (recordSizeInBits > 32) {
              newData += that.records[index]._data.slice(32);
            }

            that.records[index].data = newData;
          };
        });

        this.table2Records.forEach((record, index) => {
          const that = this;

          record.on('change', function (secondTableField) {
            this.isChanged = true;
            that.emit('change');
          });
        });

        this.recordsRead = true;
        resolve(this);
      } else {
        resolve(this);
      }
    });
  };

  _parseEmptyRecords() {
    const firstEmptyRecord = this.header.nextRecordToUse;
    const sizeOfEachRecord = this.header.record1Size;
    
    let emptyRecords = new Map();

    let previousEmptyRecordIndex = null;
    let currentEmptyRecordIndex = firstEmptyRecord;

    if (firstEmptyRecord !== this.header.recordCapacity) {
      while (currentEmptyRecordIndex !== this.header.recordCapacity) {
        // let nextEmptyRecordIndex = this.data.readUInt32BE(this.header.table1StartIndex + (currentEmptyRecordIndex * sizeOfEachRecord));
        let nextEmptyRecordIndex = utilService.getReferenceData(this.records[currentEmptyRecordIndex]._data.slice(0, 32)).rowNumber;

        emptyRecords.set(currentEmptyRecordIndex, {
          previous: previousEmptyRecordIndex,
          next: nextEmptyRecordIndex
        });

        previousEmptyRecordIndex = currentEmptyRecordIndex;
        currentEmptyRecordIndex = nextEmptyRecordIndex;
      }
    }

    return emptyRecords;
  };


  _parseTable2Values(data, header, records) {
    const that = this;
    const secondTableData = data.slice(header.table2StartIndex);
  
    records.forEach((record) => {
      const fieldsReferencingSecondTable = record._fields.filter((field) => { return field.secondTableField; });
  
      fieldsReferencingSecondTable.forEach((field) => {
        field.secondTableField.unformattedValue = that.strategyBase.table2Field.getInitialUnformattedValue(field, secondTableData);
        field.secondTableField.strategy = that.strategyBase.table2Field;
        that.table2Records.push(field.secondTableField);
      });
    });
  };
};

module.exports = FranchiseFileTable;

function readOffsetTable(data, schema, header) {
  let currentIndex = header.offsetStart;
  let offsetTable = parseOffsetTableFromData();
  // console.log(offsetTable.sort((a,b) => { return a.indexOffset - b.indexOffset}))
  sortOffsetTableByIndexOffset();

  for(let i = 0; i < offsetTable.length; i++) {
    let curOffset = offsetTable[i];
    let nextOffset = offsetTable.length > i + 1 ? offsetTable[i+1] : null;

    if (nextOffset) {
      let curIndex = i+2;
      while(nextOffset && (nextOffset.final || nextOffset.const || nextOffset.type.indexOf('()') >= 0)) {
        nextOffset = offsetTable[curIndex];
        curIndex += 1;
      }

      if (nextOffset) {
        curOffset.length = nextOffset.indexOffset - curOffset.indexOffset;  
      } else {
        curOffset.length = (header.record1Size * 8) - curOffset.indexOffset;
      }      
    }
    else {
      curOffset.length = (header.record1Size * 8) - curOffset.indexOffset;
    }

    if (curOffset.length > 32) {
      curOffset.length = 32;
    }
  }

  let currentOffsetIndex = 0;
  let chunked32bit = [];
 
  for (let i = 0; i < header.record1Size * 8; i += 32) {
    let chunkedOffsets = [];
    let offsetLength = i % 32;

    do {
      const currentOffset = offsetTable[currentOffsetIndex];

      if (currentOffset) {
        if (currentOffset.final || currentOffset.const || currentOffset.type.indexOf('()') >= 0) {
          currentOffsetIndex += 1;
          continue;
        }
        
        offsetLength += currentOffset.length;
        chunkedOffsets.push(currentOffset);
  
        currentOffsetIndex += 1;
      } else {
        break;
      }
    } while((currentOffsetIndex < offsetTable.length) && offsetLength < 32);

    chunked32bit.push(chunkedOffsets);
  }

  chunked32bit.forEach((offsetArray) => {
    if (offsetArray.length > 0) {
      let currentOffset = offsetArray[0].indexOffset;
      offsetArray[offsetArray.length - 1].offset = currentOffset;

      for (let i = offsetArray.length - 2; i >= 0; i--) {
        let previousOffset = offsetArray[i+1];
        let offset = offsetArray[i];
        offset.offset = previousOffset.offset + previousOffset.length;
      }
    }
  });

  offsetTable = offsetTable.filter((offset) => { return !offset.final && !offset.const && offset.type.indexOf('()') === -1; });
  offsetTable.sort((a,b) => { return a.offset - b.offset; });
  
  for (let i = 0; i < offsetTable.length; i++) {
    schema.attributes[offsetTable[i].index].offsetIndex = i;
  }

  return offsetTable;

  function sortOffsetTableByIndexOffset() {
    offsetTable.sort((a, b) => { return a.indexOffset - b.indexOffset; });
  };

  function parseOffsetTableFromData() {
    let table = [];

    schema.attributes.forEach((attribute, index) => {
      const minValue = parseInt(attribute.minValue);
      const maxValue = parseInt(attribute.maxValue);

      table.push({
        'index': index,
        'originalIndex': parseInt(attribute.index),
        'name': attribute.name,
        'type': (minValue < 0 || maxValue < 0) ? 's_' + attribute.type : attribute.type,
        'isReference': !attribute.enum && (attribute.type[0] == attribute.type[0].toUpperCase() || attribute.type.includes('[]')) ? true : false,
        'valueInSecondTable': header.hasSecondTable && attribute.type === 'string',
        'isSigned': minValue < 0 || maxValue < 0,
        'minValue': minValue,
        'maxValue': maxValue,
        'maxLength': attribute.maxLength ? parseInt(attribute.maxLength) : null,
        'final': attribute.final === 'true' ? true : false,
        'indexOffset': utilService.byteArrayToLong(data.slice(currentIndex, currentIndex + 4), true),
        'enum': attribute.enum,
        'const': attribute.const
      });
      currentIndex += 4;
    });

    return table;
  };
};

function readRecords(data, header, offsetTable) {
  const binaryData = utilService.getBitArray(data.slice(header.table1StartIndex, header.table2StartIndex));

  let records = [];

  if (binaryData) {
    for (let i = 0; i < binaryData.length; i += (header.record1Size * 8)) {
      const recordBinary = binaryData.slice(i, i + (header.record1Size * 8));
      records.push(new FranchiseFileRecord(recordBinary, (i / (header.record1Size * 8)), offsetTable));
    }
  }

  return records;
};

function isLoadingNewOffsets(currentlyLoaded, attribsToLoad, offsetTable) {
  const names = currentlyLoaded.map((currentlyLoadedOffset) => { return currentlyLoadedOffset.name; });

  if (attribsToLoad) {
    let newAttribs = attribsToLoad.filter((attrib) => {
      return !names.includes(attrib);
    });
  
    return newAttribs.length > 0;
  }
  else {
    return currentlyLoaded.length !== offsetTable.length;
  }
};