const express = require('express')
const router = express.Router()
const fs = require('fs');
var xlsx = require('json-as-xlsx')
const readXlsxFile = require('read-excel-file/node')


router.get('/', (req, res) => {
    res.render('contact', {
      data: {},
      errors: {}
    });
  });

  router.post('/json-xlsx', (req, res) => {

    req.pipe(req.busboy);
    req.busboy.on('file', function (fieldname, file, filename) {
        file.on("data", async(data) => {
            var json = JSON.parse(data.toString())

            var content = []
            var columns = {}

            var row = await rowFunction(content,json,columns,'')
            content = row[0]
            columns = Object.values(row[1])
              
              var settings = {
                sheetName: 'Data',
                extraLength: 3
              }
              
              res.set({
                'Content-Disposition': 'attachment; filename='+filename+'.xlsx'
              });
              
            res.send(xlsx(columns, content, settings, false));
            // res.send(row[0]);
        });
    });


  });

  router.post('/json-array', (req, res) => {

    req.pipe(req.busboy);
    req.busboy.on('file', function (fieldname, file, filename) {
        file.on("data", async(data) => {
            var json = JSON.parse(data.toString())

            var content = []
            let keys = Object.keys(json)
            for (let index = 0; index < keys.length; index++) {
              json[keys[index]].objectID = keys[index]
              content.push(json[keys[index]])
              
            }
              
              res.set({
                'Content-Disposition': 'attachment; filename='+filename+'.xlsx'
              });
              

            res.send(content);
        });
    });


  });

  router.post('/xlsx-json', (req, res) => {

    req.pipe(req.busboy);
    req.busboy.on('file', function (fieldname, file, filename) {
          var mainColumns = []
          var mainColumnsRoute = []
          var allColumns = {}
          var json = {}
          readXlsxFile(file).then(async(rows) => {
            const headers = rows[0]
            for (let propIndex = 0; propIndex < headers.length; propIndex += 1) {
              const level = headers[propIndex].split('.').length-1
              if(!allColumns[level]) allColumns[level] = []
              allColumns[level].push(propIndex)
              if(headers[propIndex].includes("id_")){
                mainColumns.push(propIndex)
                let arrayRoute = headers[propIndex].split('.')
                arrayRoute.pop()
                mainColumnsRoute.push(arrayRoute)
              }
            }
            var rowLevel = 0
            var rowPosibleLevels = [0]
            var previusColumnsRoute = {}
            for (let propIndex = 1; propIndex < rows.length; propIndex += 1) {
              let row = rows[propIndex]
              var result = await rowLevelSeach(rowPosibleLevels,allColumns,json,headers,mainColumns,row,mainColumnsRoute,previusColumnsRoute)
              rowPosibleLevels = result[0]
              json = result[1]
              previusColumnsRoute = result[2]
            }
            res.set({
              'Content-Disposition': 'attachment; filename='+filename+'.json'
            });  
            
            
          res.send(json);
          })
           

    });


  });

  const rowLevelSeach = async (rowPosibleLevels,allColumns,json,headers,mainColumns,row,mainColumnsRoute,previusColumnsRoute) => {
    for (let propIndex = 0; propIndex < rowPosibleLevels.length; propIndex += 1) {
      let rowLevel = rowPosibleLevels[propIndex]
      if(row[mainColumns[rowLevel]] && row[mainColumns[rowLevel]] !== null){ // si esta esta fila en el nivel
        var route = json
        if(rowLevel>0){

          let columnsRoute = Object.keys(previusColumnsRoute)
          // if(previusColumnsRoute[2] == 'gLyjChjEZfHukfTRKs1co5') console.log(previusColumnsRoute[rowLevel])
          
          for (let index = 0; index < columnsRoute.length; index++) {
            const rout = previusColumnsRoute[index];
            
            if(!!json[rout]){
              route = json[rout] 
            }

            if(!!mainColumnsRoute[rowLevel][index]) {
              if(!!route[rout]){
                route = route[rout] 
              }
              route[mainColumnsRoute[rowLevel][index]] = route[mainColumnsRoute[rowLevel][index]] ? route[mainColumnsRoute[rowLevel][index]] : {}
              route = route[mainColumnsRoute[rowLevel][index]]
            }
          }
        }

        if(allColumns[rowLevel].length !== 0){ // si hay otras columnas en nivel

          route[row[mainColumns[rowLevel]]] = await rowContent(row,allColumns[rowLevel],headers) // se guarda la innfo de esas columnas en ese campo
        }else{
          route[row[mainColumns[rowLevel]]] = 0 //sino se guarda un cero
        }
        previusColumnsRoute[rowLevel] = row[mainColumns[rowLevel]]
        rowPosibleLevels = []
        for (let index = 0; index <= rowLevel+1; index++) {
          rowPosibleLevels.push(index)
        }
      }
    }
    return [rowPosibleLevels,json,previusColumnsRoute]
  }
  

  const rowContent = async (row,columns,headers) => {
    var data = {}
    for (let propIndex = 1; propIndex < columns.length; propIndex += 1) {
      let column = columns[propIndex]
      let splitHeaders = headers[column].split('.')
      if(row[column] !== null) data[splitHeaders[splitHeaders.length-1]] = row[column]
    }

    return data
  }

  const rowFunction = async (content, json, columns, idColumn) => {
    var extrarows = []
    let idrow = idColumn ? idColumn + ".id_" : "id_"
    const propNames = Object.keys(json)
    columns[idrow] = { label: idrow, value: idrow }
    for (let propIndex = 0; propIndex < propNames.length; propIndex += 1) {
        const key = propNames[propIndex]
        const item = json[key]
        const row = {}
        const itemKeys = Object.keys(item)
        for (let itemKeyIndex = 0; itemKeyIndex < itemKeys.length; itemKeyIndex += 1) {
            const id = itemKeys[itemKeyIndex]
            const idNested = idColumn ? idColumn+'.'+id : id
            if (typeof item[id] == 'object') {
                let extra = await rowFunction(content, item[id], columns, idNested)
                extrarows = extrarows.concat(extra[0])
                columns = { ...extra[1], ...columns }
            } else {
                let idcolumn = idColumn ? idColumn + '.' + id : id
                if (columns[idcolumn] === undefined) {
                    columns[idcolumn] = { label: idcolumn, value: idcolumn }
                }
                row[idcolumn] = item[id]
            }
        }
        row[idrow] = key
        content.unshift(row)
    }
    
    return [content, columns]
}


  router.post('/cert', (req, res) => {

    req.pipe(req.busboy);
    req.busboy.on('file', function (fieldname, file, filename) {
        file.on("data", async(data) => {

            var prefix = '-----BEGIN CERTIFICATE-----\n';
            var postfix = '-----END CERTIFICATE-----';
            var pemText = prefix + data.toString('base64').match(/.{0,64}/g).join('\n') + postfix;
              
              res.set({
                'Content-Disposition': 'attachment; filename='+filename+'.pem'
              });
              
            // res.send(xlsx(columns, content, settings, false));
            res.send(pemText);
        });
    });


  });

module.exports = router