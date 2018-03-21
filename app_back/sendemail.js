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
        request.input('idBanco', sql.Int, req.query.idBanco);
        request.input('idDeposito', sql.Int, req.query.idDeposito);

        request.execute('DEPOSITOSEMAIL_SP').then(function(result) {
            dbCnx.close();
            var fileName = getNameFile();

            var json2xls = require('json2xls');
            var xls = json2xls(result.recordsets[0]);
            fs.writeFileSync('files/'+ fileName +'.xlsx', xls, 'binary');

            sendEmailDepositos( fileName ).then( function( result ){
                fs.unlink( 'files/'+ fileName +'.xlsx', function(err) {
                    if (err) {
                        res.end(err);
                    } else {
                        res.json(result);
                    }
                });
                
            });
        }).catch(function(err) {
            dbCnx.close();
        });

    }).catch(function(err) {
        console.log(err);
        dbCnx.close();
    });
});

function getNameFile(){
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

    today = yyyy + '' + mm + '' + dd + '' + hh + '' + min + '' + ss;
    return today
}


function sendEmailDepositos( fileXSLX ){
    return new Promise(function(resolve, reject) {
        var token = 'abcd';
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
            to: 'alex9abril@gmail.com, agrijalva@bism.com.mx',
            subject: 'Verifique su cuenta', // Subject line 
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
                        <center><img id="headerImage" style="width: 280px;" src="http://inversorlatam.com/wp-content/uploads/2016/07/Logo-Grupo-Andrade-Completo.jpg" alt="" /></center>
                    </td>
                    <td>&nbsp;</td>
                </tr>
                <tr bgcolor="#f5f5f5">
                    <td>&nbsp;</td>
                    <td style="padding: 15px; width:600px" bgcolor="#FCFAFB">
                        <h1 style="font-size: 24px; font-family: 'Raleway', sans-serif; font-style: normal;"><span style="color: #333;">Bienvenid@</span></h1>
                        <!-- <h1 style="font-size: 24px; font-family: 'Raleway', sans-serif; font-style: normal;"><span style="color: #333;">{{ tem_asunto }}</span></h1> -->
                        <p style="font-size: 16px; line-height: 24px; font-family: 'Raleway', sans-serif; font-style: normal;"><span style="color: #333;">Hola, gracias por registrarte en el portal, para poder ingresar debes verificar tu cuenta.</p>
                        <!-- <p style="font-size: 16px; line-height: 24px; font-family: 'Raleway', sans-serif; font-style: normal;"><span style="color: #333;">{{ tem_mensaje }}</p> -->
                        <br />
                        <div style="font-size: 16px; line-height: 24px; font-family: 'Raleway', sans-serif; font-style: normal;"><span style="color: #333;">Puedes ingresar desde el siguiente bot&oacute;n:</span></div>
                        <br />
                        <center>
                            <br />
                            <div style="font-size: 12px;">
                                <div style="font-size: 18px;"><a class="btn-form" style="font-family: 'Raleway', sans-serif; width: 150px; background-color: #013064; border: solid 1px #013064; color: white !important; text-decoration: none !important; padding: 10px 30px;" href="http://192.168.20.99:3500/activacionCuenta?token=` + token + `">Verificar cuenta</a></div>
                                <br /><br /><br />
                            </div>
                           
                            <p style="font-size: 16px; line-height: 24px; font-family: 'Raleway', sans-serif; font-style: normal;"><span style="color: #333;">¿Problemas con el botón? <br /> Copia y pega el siguiente link: <br> http://192.168.20.99:3500/activacionCuenta?token=` + token + ` </p>
                        </center>
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