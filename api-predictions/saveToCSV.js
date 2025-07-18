// saveToCSV.js
const fs = require('fs');
const { createObjectCsvWriter } = require('csv-writer');

const csvFile = '../app/shared/datos_ruido_2025_final.csv';

// Inicializa CSV con encabezados si no existe
if (!fs.existsSync(csvFile)) {
    const headerWriter = createObjectCsvWriter({
        path: csvFile,
        header: [
            { id: 'time_instant', title: 'TimeInstant' },
            //{ id: 'period', title: 'Period ' },
            //{ id: 'status', title: 'Status' },
            { id: 'son_laeq', title: 'son_laeq' },
            { id: 'son_lamax', title: 'son_lamax' },
            { id: 'son_lamin', title: 'son_lamin' },
            { id: 'son_la1', title: 'son_la1' },
            { id: 'son_la10', title: 'son_la10' },
            { id: 'son_la50', title: 'son_la50' },
            { id: 'son_la90', title: 'son_la90' },
            { id: 'son_la99', title: 'son_la99' },
        ]
    });
    headerWriter.writeRecords([]); // solo para crear el archivo
}

const appendToCSV = async (data) => {
    const writer = createObjectCsvWriter({
        path: csvFile,
        append: true,
        header: [
            { id: 'time_instant', title: 'TimeInstant' },
            //{ id: 'period', title: 'Period ' },
            //{ id: 'status', title: 'Status' },
            { id: 'son_laeq', title: 'son_laeq' },
            { id: 'son_lamax', title: 'son_lamax' },
            { id: 'son_lamin', title: 'son_lamin' },
            { id: 'son_la1', title: 'son_la1' },
            { id: 'son_la10', title: 'son_la10' },
            { id: 'son_la50', title: 'son_la50' },
            { id: 'son_la90', title: 'son_la90' },
            { id: 'son_la99', title: 'son_la99' },
        ]
    });
    await writer.writeRecords([data]);
};

module.exports = appendToCSV;