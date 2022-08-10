//************************************* */
// Requerimos todas las librerias que vamos a usar
//************************************* */
const express = require('express');
const mysql = require('mysql');
const dotenv = require('dotenv');
const util = require('util');


//************************************* */
// Llamamos a express y a los middleware que vamos a usar
//************************************* */

const app = express();

dotenv.config();
app.use(express.static('public'));
app.use(express.urlencoded({extended: false}));
app.use(express.json());

app.set('view engine', 'ejs');


//************************************* */
// Esta es la seccion de la base de datos
//************************************* */

//Hacemos el pool para la base de datos en este caso uso mySQL, los valores de cada uno vienen del archivo .env
const pool = mysql.createPool({
  host: process.env.HOST,
  user: process.env.USER,
  password: process.env.PASSWORD,
  database: process.env.DATABASE
});

//Establecemos la conexion 
pool.getConnection((err, connection)=>{
  if(err) throw err;

  if(connection) connection.release();
  console.log('BD conectada');

  // Puedes crear la base de datos llamda donas_pancha con el siguiente codigo

  // pool.query("CREATE DATABASE donas_pancha", function (err, result) {
  //   if (err) throw err;
  //   console.log("Base de datos creada...");
  // });
  
  //Para crear la tabla con el siguiente codigo
  //El nombre del producto sera la llave primary porque el nombre es unico y para el usuario no se preocupe por algun id
  //Cantidad y precio seran NOT NULL porque es obligatorio que tengan valor
  //El limite de precio es 999.99 porque solo puede haber 5 digitos con 3 antes del punto

  // const sql = "CREATE TABLE productos (nombre VARCHAR(255) PRIMARY KEY, cantidad INT NOT NULL, precio DECIMAL (5, 2) NOT NULL)";
  // pool.query(sql, function (err, result) {
  //   if (err) throw err;
  //   console.log("Tabla creada...");
  // });

  return;
});

//Usamos util.promisify para poder usar async/await con los queries
pool.query = util.promisify(pool.query);


//************************************* */
// Esta es la seccion de las rutas
//************************************* */

//Ruta de inicio, hace el render del archivo index de la carpeta views
app.get('/', (req, res)=>{
  res.render('index');
});

//Rutas para registrar un nuevo producto
//Hace el render del archivo registrar de la views
app.get('/db/registrar', (req, res)=>{
  res.render('registrar');
});

app.post('/db/registrar', async (req, res)=>{
  //Decomstruimos la informacion recibida del formulario en el req.body
  //nombre es el nombre del producto
  //cantidad es la cantidad del producto
  //precio es el precio del producto
  const { nombre, cantidad, precio } = req.body;

  //Esta es una version por si quieren hacer todo en minusculas
  // await pool.query(`INSERT INTO productos VALUES('${nombre.toLowerCase()}', ${cantidad}, ${precio})`);

  //Usamos await para hacer el query e introducimos los valores en el orden correcto
  await pool.query(`INSERT INTO productos VALUES('${nombre}', ${cantidad}, ${precio})`);
  //Hacemos un redireccion para ver la base de datos
  res.redirect('/db/ver');
});

//Rutas para modificar las filas de la base de datos
//Hacemos el render del archivo modificar de la carpeta views
app.get('/db/modificar', (req, res)=>{
  res.render('modificar');
});

//Deberia de ser app.put para actualizar pero como estoy usando un formulario uso post
app.post('/db/modificar', async (req, res)=>{
  //Recibimos los datos de req.body
  //nombre es el nombre del producto
  //aCambiar es lo que vamos a cambiar, puede ser precio o cantidad
  //nuevoValor es el nuevo valor que vamos a asignar a precio o cantidad
  const { nombre, aCambiar, nuevoValor } = req.body;

  //Si nos dan un valor para el precio mayor a 999.99 por ahora solo regresamos al formulario
  if(aCambiar === 'precio' && nuevoValor > 999.99){
    res.redirect('/db/modificar');
    return;
  }

  //Esta es una version por si quieren hacer todo en minusculas
  // if(aCambiar === 'cantidad') await pool.query(`UPDATE productos SET cantidad = ${nuevoValor} WHERE nombre = '${nombre.toLowerCase()}'`);
  // else if(aCambiar === 'precio') await pool.query(`UPDATE productos SET precio = ${nuevoValor} WHERE nombre = '${nombre.toLowerCase()}'`);

  //Si desean cambiar l cantidad hacemos el query para hacer el cambio, donde el nombre que nos pasaron sea igual al nombre de una fila
  //Lo mismo hacemos con precio
  if(aCambiar === 'cantidad') await pool.query(`UPDATE productos SET cantidad = ${nuevoValor} WHERE nombre = '${nombre}'`);
  else if(aCambiar === 'precio') await pool.query(`UPDATE productos SET precio = ${nuevoValor} WHERE nombre = '${nombre}'`);
  
  //Hacemos un redireccion para ver la base de datos
  res.redirect('/db/ver');
});

//Ruta para ver la base de datos, con nombre y cantidad
app.get('/db/ver', async (req, res)=>{
  //Hacemos el query para seleccionar las columnas del nombre y la cantidad de productos y las ordenamos en orden alfabetico
  const db = await pool.query('SELECT nombre, cantidad FROM productos ORDER BY nombre');

  //Si no hay datos en la base de datos hacemos render del archivo verVacio de la carpeta views
  if(db.length === 0){
    res.render('verVacio');
    return;
  }
  else res.render('ver', { data : db }); //Si hay datos en la base de datos, hacemos render del archivo ver de la carpeta views y pasamos los datos como data 
});

//Ruta para eliminar un producto
//Hacemos render del archivo eliminar de la carpeta views 
app.get('/db/eliminar', (req, res)=>{
  res.render('eliminar');
});

//Deberia de ser delete pero estamos usando formulario y por eso es post 
app.post('/db/eliminar', async (req, res)=>{
  //Deconstruimos la variable nombre, que es el nombre del producto, de req.body
  const { nombre } = req.body;

  //Hacemos el query para eliminar la fila donde el nombre sea igual a nombre de una fila de la tabla
  await pool.query(`DELETE FROM productos WHERE nombre = '${nombre}'`);

  //Hacemos un redireccion para ver la base de datos
  res.redirect('/db/ver');
});

//Si vamos a una ruta que no exista mostramos una pagina sencilla y mandamos el estado 404
app.get('*', (req, res)=>{
  res.status(404).render('error');
});

//definimos el port que viene de .env
const port = process.env.PORT;

app.listen(port, ()=>{
    console.log(`Escuchando en el puerto ${port} ...`);
});

