// saveToCSV.js
const fs = require('fs');
const { createObjectCsvWriter } = require('csv-writer');

const csvFile = 'datos_sensores.csv';

// Inicializa CSV con encabezados si no existe
if (!fs.existsSync(csvFile)) {
    const headerWriter = createObjectCsvWriter({
        path: csvFile,
        header: [
            { id: 'time_instant', title: 'TimeInstant' },
            { id: 'period', title: 'Period' },
            { id: 'status', title: 'Status' },
            { id: 'son_laeq', title: 'Laeq' },
            { id: 'son_lamax', title: 'Lamax' },
            { id: 'son_lamin', title: 'Lamin' },
            { id: 'son_la1', title: 'La1' },
            { id: 'son_la10', title: 'La10' },
            { id: 'son_la50', title: 'La50' },
            { id: 'son_la90', title: 'La90' },
            { id: 'son_la99', title: 'La99' },
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
            { id: 'period', title: 'Period' },
            { id: 'status', title: 'Status' },
            { id: 'son_laeq', title: 'Laeq' },
            { id: 'son_lamax', title: 'Lamax' },
            { id: 'son_lamin', title: 'Lamin' },
            { id: 'son_la1', title: 'La1' },
            { id: 'son_la10', title: 'La10' },
            { id: 'son_la50', title: 'La50' },
            { id: 'son_la90', title: 'La90' },
            { id: 'son_la99', title: 'La99' },
        ]
    });
    await writer.writeRecords([data]);
};

module.exports = appendToCSV;