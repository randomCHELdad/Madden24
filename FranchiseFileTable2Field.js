class FranchiseFileTable2Field {
  constructor(index, maxLength, parent) {
    this._value = '';
    this.rawIndex = index;
    this.isChanged = false;
    this.maxLength = maxLength;
    this.fieldReference = null;
    this.lengthAtLastSave = null;
    this._unformattedValue = null;
    this.index = index;
    this._offset = this.index;
    this._parent = parent;
  };

  get unformattedValue() {
    return this._unformattedValue;
  };

  set unformattedValue(value) {
    this._unformattedValue = value;

    if (this.lengthAtLastSave === null) {
      this.lengthAtLastSave = getLengthOfUnformattedValue(this._unformattedValue);
    }

    this._value = null;
    if (this._parent) {
      this._parent.onEvent('change', this);
    }
  };

  get value() {
    if (this._value === null) {
      this._value = this._unformattedValue.toString().replace(/\0.*$/g, '');
    }

    return this._value;
  };

  set value(value) {
    this._value = value;

    if (value.length > this.maxLength) {
      value = value.substring(0, this.maxLength);
    }

    this._unformattedValue = this._strategy.setUnformattedValueFromFormatted(value, this.maxLength);

    if (this.lengthAtLastSave === null) {
      this.lengthAtLastSave = getLengthOfUnformattedValue(this._unformattedValue);
    }

    this._parent.onEvent('change', this);
  };

  get hexData() {
    return this._unformattedValue;
  };

  get strategy() {
    return this._strategy;
  };

  set strategy(strategy) {
    this._strategy = strategy;
  };

  get offset() {
    return this._offset;
  };

  set offset(offset) {
    const offsetChanged = this._offset !== offset;
    this._offset = offset;
    this.index = offset;

    if (offsetChanged && this.fieldReference) {
      this.fieldReference.unformattedValue.setBits(this.fieldReference.offset.offset, offset, 32);
      this.fieldReference.isChanged = true;
      this.fieldReference._bubbleChangeToParent();
    }
  };

  get parent() {
    return this._parent;
  };

  set parent(parent) {
    this._parent = parent;
  };
};

module.exports = FranchiseFileTable2Field;

function getLengthOfUnformattedValue(value) {
  return value.length;
};