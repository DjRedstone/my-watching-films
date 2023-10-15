const CONFIG = require("./config.json");
const express = require("express");
const app = express();
const http = require("http").createServer(app);
const path = require("path");
const port = CONFIG.PORT;
const { XMLHttpRequest } = require("xmlhttprequest");
const { Socket } = require('socket.io');
const io = require("socket.io")(http);
const mysql = require('mysql');
const dbData = {
  host: CONFIG.DB_HOST,
  user: CONFIG.DB_USER,
  password: CONFIG.DB_PASS,
  database: CONFIG.DB_NAME,
  ssl: { rejectUnauthorized: false }
};
const fs = require('fs');
const yaml = require('js-yaml');

let db;
function connectDatabase() {
  const localDB = mysql.createConnection(dbData);
  
  localDB.connect((err) => {
    if (err) throw err;
    console.log("Connected to Database !");
    db = localDB;
  });

  localDB.on("error", (err) => {
    if (err.code === "PROTOCOL_CONNECTION_LOST") {
      console.log("Connexion lost on database. Trying to reconnect...");
      connectDatabase();
    } else {
      throw err;
    }
  });
}
connectDatabase();

app.use("/jquery", express.static(path.join(__dirname, 'node_modules/jquery/dist')));
app.use(express.static("public"));
app.use(express.static("test"));

const TRADS = {};
const defaultTrad = "en";
TRADS[defaultTrad] = yaml.load(fs.readFileSync(`./traductions/${defaultTrad}.yml`, "utf8"));
for (const fileName of fs.readdirSync("./traductions/")) {
	if (fileName.endsWith(".yml")) {
		const lang = fileName.slice(0, -4);
		try {
		  const data = yaml.load(fs.readFileSync(`./traductions/${fileName}`, "utf8"));
		  TRADS[lang] = data;
		} catch (e) {
		  console.log(e);
		}
	}
}

function searchCinema(query) {
	return makeRequest(`https://data.culture.gouv.fr/api/records/1.0/search/?dataset=etablissements-cinematographiques&rows=5&q=${query}`).records;
}

function makeRequest(URL) {
	const xmlHttp = new XMLHttpRequest();
	xmlHttp.open("GET", URL, false);
	xmlHttp.send(null);
	return JSON.parse(xmlHttp.responseText);
}

function searchFilms(name) {
	return makeRequest(`https://www.omdbapi.com/?apikey=${process.env["OMDB_KEY"]}&type=movie&s=${name}`).Search.slice(0, 5);
}

function addDataToUser(userID, cinemaID, filmID, date, room) {
	console.log(`Adding ${filmID} to ${userID} in ${cinemaID}...`);
	db.query(`INSERT INTO viewed (userID, filmID, cinemaID, date, room) VALUES (${userID}, ${filmID}, ${cinemaID}, ${(date != null) ? ("\"" + date.toISOString().slice(0, 19).replace('T', ' ') + "\"") : "NULL"}, ${room})`, (err, res) => {
    if (err) throw err;
  });
}

app.get("/", (req, res) => {
	res.sendFile(path.join(__dirname, "public"));
  // res.sendFile(path.join(__dirname, "test/index.html"));
});

http.listen(port, () => {
  console.log(`App server is running on port ${port}`);
});

function error(lang, code) {
	const res = {type: "error", code: code};
  const messages = TRADS[lang].error;
  try {
    res.message = messages[`${code}`];
  } catch(err) {}
	return res
}

function createToken() {
	return Math.random().toString(36).replace(/[^a-z]+/g, '').substr(2, 10);
}

io.on("connection", (socket) => {
	let token;
	let language;

	socket.on("get-traductions", (lang) => {
		const data = TRADS[lang];
		if (data != undefined) {
			language = lang;
			socket.emit("get-traductions", data);
		} else {
			language = defaultTrad;
			socket.emit("get-traductions", TRADS[defaultTrad]);
		}
	});
	
	socket.on("search-films", (query) => {
		const films = searchFilms(query);
		socket.emit("get-films", films);
	});
	
	socket.on("search-cinemas", (query) => {
    const cinemas = searchCinema(query);
    socket.emit("get-cinemas", cinemas);
	});
	
	socket.on("login", (data) => {
		const user = data.user;
		const password = data.password;
		db.query(`SELECT * FROM users WHERE user = "${user}" AND password = "${password}"`, (err, res) => {
			if (err) {
				console.log(err);
				socket.emit("login", error(language, 0));
				return
			}
			if (res.length == 0) {
				socket.emit("login", error(language, 1));
				return
			}
			const userData = JSON.parse(JSON.stringify(res[0]));
			token = createToken();
			socket.emit("login", {type: "succes", userData: userData, token: token});
		});
	});
	
	socket.on("sign-up", (data) => {
    const user = data.user;
		db.query(`SELECT * FROM users WHERE user = "${user}"`, (err, res) => {
			if (err) {
				console.log(err);
				socket.emit("sign-up", error(language, 0));
				return
			}
			if (res.length != 0) {
				socket.emit("sign-up", error(language, 3));
				return
			}
      const password = data.password;
      db.query(`INSERT INTO users (user, password, name) VALUES ("${user}", "${password}", "${user}")`, (err, res) => {
        if (err) {
					console.log(err);
					socket.emit("sign-up", error(language, 0));
					return
				}
				db.query(`SELECT * FROM users WHERE user = "${user}" AND password = "${password}"`, (err, res) => {
				  if (err) {
						console.log(err);
						socket.emit("sign-up", error(language, 0));
						return
					}
					const userData = JSON.parse(JSON.stringify(res[0]));
          token = createToken();
					socket.emit("sign-up", {type: "succes", userData: userData, token: token});
        });
      });
		});
	});

	socket.on("change-user-name", (data) => {
		if (data.token != token) {
			socket.emit("change-user-name", error(language, 2));
      return
		}
    const userID = data.userID;
		const newName = data.newName;
		db.query(`UPDATE users SET name = "${newName}" WHERE uuid = ${userID}`, (err, res) => {
      if (err) {
				console.log(err);
				socket.emit("change-user-name", error(language, 0));
				return
			}
			socket.emit("change-user-name", {type: "succes"});
		});
	});

	socket.on("change-user-username", (data) => {
		if (data.token != token) {
			socket.emit("change-user-username", error(language, 2));
      return
		}
    const userID = data.userID;
		const newUserName = data.newUserName;
		db.query(`UPDATE users SET user = "${newUserName}" WHERE uuid = ${userID}`, (err, res) => {
      if (err) {
				console.log(err);
				socket.emit("change-user-username", error(language, 0));
				return
			}
			socket.emit("change-user-username", {type: "succes"});
		});
	});

	socket.on("change-user-password", (data) => {
		if (data.token != token) {
			socket.emit("change-user-password", error(language, 2));
      return
		}
    const userID = data.userID;
		const newPassword = data.newPassword;
		db.query(`UPDATE users SET password = "${newPassword}" WHERE uuid = ${userID}`, (err, res) => {
      if (err) {
				console.log(err);
				socket.emit("change-user-password", error(language, 0));
				return
			}
			socket.emit("change-user-password", {type: "succes"});
		});
	});
});
