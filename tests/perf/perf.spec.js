const { expect } = require('chai');
const { resolve } = require('path');
const path = require('path');

const FranchiseFile = require('../../FranchiseFile');
const filePaths = {
    'compressed': {
      'm21': 'tests/data/CAREER-21COMPRESS'
    },
    'uncompressed': {
      'm21': 'tests/data/21UNCOMPRESS.frt'
    },
    'saveTest': {
      'm21': 'tests/data/CAREER-TESTSAVE-21'
    }
};

let file = new FranchiseFile(filePaths.compressed.m21, {
    'autoParse': false,
    'schemaDirectory': path.join(__dirname, '../data/test-schemas')
});

describe('madden franchise performance tests', function () {
    this.timeout(7000);

    let testIndex = 0;
    let memoryBefore;

    before(async () => {
        memoryBefore = getHeapInMB();
        console.time('parse');
        
        await file.parse();

        if (!file.isLoaded) {
            await new Promise((resolve) => {
                file.on('ready', () => {
                    resolve();
                });
            });
        }

        console.timeEnd('parse');
        
        const memoryAfter = getHeapInMB();
        const memoryUsedInTest = (memoryAfter - memoryBefore).toFixed(2);
        console.log(`Parse used approximately ${memoryUsedInTest} MB`);
    });

    beforeEach(() => {
        memoryBefore = getHeapInMB();
        console.time(testIndex);
    });

    afterEach(() => {
        console.timeEnd(testIndex);
        testIndex += 1;

        const memoryAfter = getHeapInMB();
        const memoryUsedInTest = (memoryAfter - memoryBefore).toFixed(2);
        console.log(`Test used approximately ${memoryUsedInTest} MB`);
    });

    describe('read records', () => {
        it('small table', async () => {
            const overallPercentage = file.getTableById(4097);
            await overallPercentage.readRecords();
        });
    
        it('large table', async () => {
            const player = file.getTableById(4226);
            await player.readRecords();
        });
    });

    describe('get and set', () => {
        let table;

        describe('small table', () => {
            before(() => {
                table = file.getTableById(4097);
            });

            it('get from record', () => {
                let value = table.records[0].PercentageSpline;
            });
    
            it('get from field explicitly', () => {
                let value = table.records[0].fields.PercentageSpline.value;
            });
        });

        describe('large table', () => {
            before(() => {
                table = file.getTableById(4226);
            });

            it('get from record', () => {
                let value = table.records[0].CareerStats;
            });
    
            it('get from field explicitly', () => {
                let value = table.records[0].CareerStats.value;
            });
        });
    });
});

function getHeapInMB() {
    return process.memoryUsage().heapUsed / 1024 / 1024;
};