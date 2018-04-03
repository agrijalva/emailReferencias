var express       = require('express');
var router        = express.Router();
var sql           = require("mssql");
var appConfig     = require('../appConfig');
var fs            = require('file-system');
var smtpTransport = require('nodemailer-smtp-transport');

const nodemailer = require('nodemailer');
// middleware that is specific to this router
router.use(function timeLog(req, res, next) {
    next();
});

// define the home page route
router.get('/', function(req, res) {
    res.json({ message: 'Test TIIE' });
});


router.get('/depositos', function(req, res) {
    var dbCnx = new sql.ConnectionPool(appConfig.connectionString);
    dbCnx.connect().then(function() {
        var request = new sql.Request(dbCnx);
        getCorreos().then( function( resultCorreos ){
            if( resultCorreos.success == 1 ){
                request.input('idBanco', sql.Int, req.query.idBanco);
                request.input('idDeposito', sql.Int, req.query.idDeposito);

                // request.input('idBanco', sql.Int, 1);
                // request.input('idDeposito', sql.Int, 53716);

                request.execute('DEPOSITOSEMAIL_SP').then(function(result) {
                    dbCnx.close();
                    var fileName = getNameFile(0);
                    // console.log( "recordsets", result.recordsets[0] );
                    if( result.recordsets[0].length == 0 ){
                        res.json({success: 0, msg: 'No hay resultados a enviar.'});
                    }
                    else{
                        var json2xls = require('json2xls');
                        var xls = json2xls(result.recordsets[0]);
                        fs.writeFileSync('files/'+ fileName +'.xlsx', xls, 'binary');

                        sendEmailDepositos( fileName, req.query.banco, resultCorreos.correos ).then( function( result ){
                            fs.unlink( 'files/'+ fileName +'.xlsx', function(err) {
                                if (err) {
                                    res.end(err);
                                } else {
                                    res.json(result);
                                }
                            });
                            
                        });
                    }
                }).catch(function(err) {
                    dbCnx.close();
                });
            }
            else{
                res.json(resultCorreos);
            }
        });
    }).catch(function(err) {
        console.log(err);
        dbCnx.close();
    });
});

function getNameFile(tipo){
    var today = new Date();
    var dd = today.getDate();
    var mm = today.getMonth()+1; //January is 0!
    var yyyy = today.getFullYear();
    var hh = today.getHours();
    var min = today.getMinutes();
    var ss = today.getSeconds();

    dd  = (dd<10) ? '0' + dd : dd;
    mm  = (mm<10) ? '0' + mm : mm;
    hh  = (hh<10) ? '0' + hh : hh;
    min = (min<10) ? '0' + min : min;
    ss  = (ss<10) ? '0' + ss : ss;

    if( tipo == 0 ){
        today = yyyy + '' + mm + '' + dd + '' + hh + '' + min + '' + ss;
    }else{
        today = yyyy + '/' + mm + '/' + dd + ' ' + hh + ':' + min + ':' + ss;
    }
    
    return today
}

function getCorreos(){
    return new Promise( function( resolve, reject ){
        var emails = [];
        var dbCnx = new sql.ConnectionPool(appConfig.connectionString);
        dbCnx.connect().then(function() {
            var request = new sql.Request(dbCnx);
            request.execute('CORREOSREPORTE_SP').then(function(result) {
                dbCnx.close();
                if( result.recordsets[0].length != 0 ){
                    result.recordsets[0].forEach( function( item, key ){
                        emails.push(item.correo);
                    });
                    resolve({success: 1, correos: emails.join()} )
                }
                else{
                    resolve({success: 0, msg: 'No hay cuentas de correos configurados, fevor de revisar la tabla [referencia].[dbo].[envioReporte]'} )
                }
            }).catch(function(err) {
                dbCnx.close();
                resolve({success: 0, msg: 'Ocurrio un error: ' + err} );
            });

        }).catch(function(err) {
            dbCnx.close();
            resolve({success: 0, msg: 'Ocurrio un error: ' + err} );
        });
    })
}


function sendEmailDepositos( fileXSLX, banco, correos ){
    return new Promise(function(resolve, reject) {
        var transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            secureConnection: false,
            port: 587,
            requiresAuth: true,
            domains: ["gmail.com", "googlemail.com"],
            auth: {
                user: 'timbrado.andrade@gmail.com',
                pass: 'S1ST3M4S'
            }
        });

        var attach = __dirname + '\\..\\files\\'+ fileXSLX +'.xlsx';
        var mailOptions = {
            from: '"Reportes GA" <grupoandrade.reportes@grupoandrade.com.mx>', // sender address 
            to: correos,
            subject: 'Depósitos Bancarios', // Subject line 
            text: '', // plaintext body 
            attachments: [
                {   // use URL as an attachment
                    filename: + fileXSLX +'.xlsx',
                    path: attach
                }
            ],
            html: `<table style="height: 401px; width: 100%;" border="0" width="826" cellspacing="0">
            <tbody>
                <tr style="height: 15px;" bgcolor="#f5f5f5">
                    <td>&nbsp;</td>
                    <td style="width:600px">
                    <td>&nbsp;</td>
                </tr>
                <tr bgcolor="#f5f5f5">
                    <td>&nbsp;</td>
                    <td bgcolor="#FCFAFB" style="width:600px"> &nbsp; </td>
                    <td>&nbsp;</td>
                </tr>
                <tr bgcolor="#f5f5f5">
                    <td>&nbsp;</td>
                    <td bgcolor="#FCFAFB" style="width:600px">
                        <center><img id="headerImage" src="http://griant.mx/images/Logo-Grupo-Andrade-Min.jpg" alt="" /></center>
                    </td>
                    <td>&nbsp;</td>
                </tr>
                <tr bgcolor="#f5f5f5">
                    <td>&nbsp;</td>
                    <td style="padding: 15px; width:600px" bgcolor="#FCFAFB">
                        <h3 style="font-size: 20px; font-family: 'Raleway', sans-serif; font-style: normal;"><span style="color: #333;">Depósitos Bancarios</span></h3>
                        <!-- <h1 style="font-size: 24px; font-family: 'Raleway', sans-serif; font-style: normal;"><span style="color: #333;">{{ tem_asunto }}</span></h1> -->
                        <p style="font-size: 16px; line-height: 24px; font-family: 'Raleway', sans-serif; font-style: normal;">
                            <span style="color: #333;">Se adjunta archivo con la relación de los depósitos bancarios bajo los siguientes criterios:</span>
                        </p>
                      <table width="100%" style="font-size: 16px; line-height: 24px; font-family: 'Raleway', sans-serif; font-style: normal;">
                        <tr>
                          <td width="100"><b>Banco</b></td>
                          <td>` + banco + `</td>
                        </tr>
                        <tr>
                          <td width="100"><b>Fecha</b></td>
                          <td>` + getNameFile(1) + `</td>
                        </tr>
                        <tr>
                          <td width="100"><b>Archivo</b></td>
                          <td>` + fileXSLX + `.xlsx</td>
                        </tr>
                      </table>
                        <!-- <p style="font-size: 16px; line-height: 24px; font-family: 'Raleway', sans-serif; font-style: normal;"><span style="color: #333;">{{ tem_mensaje }}</p> -->
                        <br />
                    </td>
                    <td bgcolor="#f5f5f5">&nbsp;</td>
                </tr>
                <tr bgcolor="#f5f5f5">
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                </tr>
                <tr bgcolor="#fff">
                    <td>&nbsp;</td>
                    <td>
                        <p style="font-size: 10px; font-family: tahoma; color: #999; padding: 15px;">&copy;2018 Todos los derechos reservados. <br /> Este e-mail fue enviado autom&aacute;ticamente, favor de no responderlo.</p>
                    </td>
                    <td>&nbsp;</td>
                </tr>
            </tbody>
        </table>`
        };
        
        transporter.sendMail(mailOptions, function(error, info) {

            if (error) {
                console.log("Error Send", error);
                resolve( { success: 0, msg: error } );
            } else {
                resolve( { success: 1, msg: info.response } );
                console.log('Message sent: ' + info.response);
            }      
        });

        transporter.close;
    })
};

module.exports = router;