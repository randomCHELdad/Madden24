const sinon = require('sinon');
const expect = require('chai').expect;
const proxyquire = require('proxyquire');

const strategySpy = {
    'generateUnpackedContents': sinon.spy()
};

const FranchiseFileStrategy = proxyquire('../../../../strategies/common/file/FranchiseFileStrategy', {
    './CommonFileStrategy': strategySpy
});

describe('Franchise File Strategy unit tests', () => {
    beforeEach(() => {
        strategySpy.generateUnpackedContents.resetHistory();
    });

    it('can save updates made to data', () => {
        let tables = [{
            'offset': 0,
            'data': Buffer.from([0x4F, 0x6C, 0x64, 0x44, 0x61, 0x74]),
            'hexData': Buffer.from([0x4F, 0x6C, 0x64, 0x44, 0x61, 0x74]),
            'isChanged': false
        }, {
            'offset': 6,
            'data': Buffer.from([0x4F, 0x6C, 0x64, 0x44, 0x61, 0x74]),
            'hexData': Buffer.from([0x4F, 0x6C, 0x64, 0x44, 0x61, 0x74]),
            'isChanged': false
        }]
        
        let data = Buffer.concat(tables.map((table) => {
            return table.hexData;
        }));

        FranchiseFileStrategy.generateUnpackedContents(tables, data);

        expect(strategySpy.generateUnpackedContents.calledOnce).to.be.true;
        expect(strategySpy.generateUnpackedContents.args[0][0]).to.eql(tables);
        expect(strategySpy.generateUnpackedContents.args[0][1]).to.eql(data);
    });

    describe('post pack file', () => {
        it('returns correct length', () => {
            const originalData = Buffer.from([0x46, 0x42, 0x43, 0x48, 0x55, 0x4E, 0x4B, 0x53, 0x01, 0x00, 0x40, 0x00, 
                0x00, 0x00, 0xCC, 0xCC, 0x2C, 0x00, 0x0C, 0xCD, 0x2C, 0x00, 0xE3, 0x07, 0x08, 0x00, 0x0F, 0x00, 0x13, 
                0x00, 0x23, 0x00, 0x15, 0x00, 0x4D, 0x32, 0x30, 0x5F, 0x52, 0x4C, 0x33, 0x2D, 0x33, 0x34, 0x32, 0x36, 
                0x39, 0x30, 0x30, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x56, 
                0x01, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x1D, 0x6B, 0x1A, 0x00, 0x00, 0x00, 
                0x00, 0x00, 0x78, 0x9C, 0xCC, 0xDD, 0x09, 0x9C, 0x5C, 0xE5, 0x40, 0x30, 0x20, 0x10, 0x00, 0x00, 0x00]);

            const newData = Buffer.from([0x78, 0x9C, 0xCC, 0xDD, 0x09, 0x9C, 0x5C, 0xE5]);

            const result = FranchiseFileStrategy.postPackFile(originalData, newData);
            expect(result.length).to.equal(originalData.length);
        });

        it('returns expected result', () => {
            const originalData = Buffer.from([0x46, 0x42, 0x43, 0x48, 0x55, 0x4E, 0x4B, 0x53, 0x01, 0x00, 0x40, 0x00, 
                0x00, 0x00, 0xCC, 0xCC, 0x2C, 0x00, 0x0C, 0xCD, 0x2C, 0x00, 0xE3, 0x07, 0x08, 0x00, 0x0F, 0x00, 0x13, 
                0x00, 0x23, 0x00, 0x15, 0x00, 0x4D, 0x32, 0x30, 0x5F, 0x52, 0x4C, 0x33, 0x2D, 0x33, 0x34, 0x32, 0x36, 
                0x39, 0x30, 0x30, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x56, 
                0x01, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x1D, 0x6B, 0x1A, 0x00, 0x00, 0x00, 
                0x00, 0x00, 0x78, 0x9C, 0x50, 0x40, 0x30, 0x20, 0x10, 0x00, 0x40, 0x30, 0x20, 0x10, 0x00, 0x00, 0x00]);

            const newData = Buffer.from([0x78, 0x9C, 0xCC, 0xDD, 0x09, 0x9C, 0x5C, 0xE5]);

            const result = FranchiseFileStrategy.postPackFile(originalData, newData);

            expect(result.slice(0x52, 0x52 + newData.length)).to.eql(newData);
            expect(result.readUIntBE(0x4A, 3)).to.eql(newData.length);
        });
    });
});