const express = require('express');
var fs = require('fs')
var https = require('https')
const app = express();

const CryptoJS = require('crypto-js')

const dotenv = require('dotenv');
dotenv.config();

app.use(express.static('public'))
app.set('view engine', 'ejs');

const { auth, requiresAuth } = require('express-openid-connect'); 
const port = process.env.PORT || 4080;

app.use(express.json())
var safeMode = [false, false, false];
var texts = [];
var users = {
  'stjepan.mlakic@fer.hr': {
    nickname: 'stjepan.mlakic',
    name: 'stjepan.mlakic@fer.hr',
    picture: 'https://s.gravatar.com/avatar/b55308e05e9de2d93dd6ee720c38a1d6?s=480&r=pg&d=https%3A%2F%2Fcdn.auth0.com%2Favatars%2Fst.png',
    updated_at: '2021-12-06T20:36:48.163Z',
    email: 'stjepan.mlakic@fer.hr',
    email_verified: true,
    sub: 'auth0|6184345192ea9a0069a0dbf4'
  }, 'gofogi2273@niekie.com': {
    nickname: 'gofogi2273',
    name: 'gofogi2273@niekie.com',
    picture: 'https://s.gravatar.com/avatar/70356f7cf06b362e8767849d406b8356?s=480&r=pg&d=https%3A%2F%2Fcdn.auth0.com%2Favatars%2Fgo.png',
    updated_at: '2021-12-09T20:33:48.628Z',
    email: 'gofogi2273@niekie.com',
    email_verified: true,
    sub: 'auth0|618795ec1b1a2e006900a201'
  }
};
const appUrl = process.env.APP_URL || `https://localhost:${port}/`

const config = { 
  authRequired : false,
  idpLogout : true, //login not only from the app, but also from identity provider
  secret: process.env.SECRET,
  baseURL: process.env.APP_URL || `https://localhost:${port}`,
  clientID: process.env.CLIENT_ID,
  issuerBaseURL: 'https://dev-528z288p.eu.auth0.com',
  clientSecret: process.env.CLIENT_SECRET,
  authorizationParams: {
    response_type: 'code' ,
    //scope: "openid profile email"   
   },
};

// auth router attaches /login, /logout, and /callback routes to the baseURL
app.use(auth(config));

app.get('/',  function (req, res) {
    req.user = {
        isAuthenticated : req.oidc.isAuthenticated()
    };
    if (req.user.isAuthenticated) {
        req.user.name = req.oidc.user.name;
        req.user.timestamp = req.oidc.user.updated_at;
    }
    res.render('index', {user : req.user, userString: JSON.stringify(req.user), appUrl});
});

app.get('/sensitive-data', requiresAuth(), function (req, res) {       
    const user = JSON.stringify(req.oidc.user)
    let textsActual = []
    if(safeMode[0]) {
      texts.forEach(t => {

      })
    } else {
      textsActual = texts
    }
    res.render('sensitive-data', {safeMode: safeMode[0], user, appUrl, database: JSON.stringify(textsActual), texts: JSON.stringify(texts)});
});

app.get('/access-control', requiresAuth(), function (req, res) {       
  
  let reqUser = req.query.user
  if(safeMode[2]) {
    if(reqUser === undefined)
      user = `User ${reqUser} doesn't exist`
    else if(reqUser !== req.oidc.user.name)
      user = `You're not authorized to view this page`
    else
      var user = JSON.stringify(req.oidc.user)
    res.render('access-control', {user, appUrl, safeMode: safeMode[2]})

  } else {
    user = users[reqUser]
    if(user === undefined)
      user = `User ${reqUser} doesn't exist`
    res.render('access-control', {user, appUrl, safeMode: safeMode[2]})
  }
});

app.get("/login", (req, res) => {
  res.oidc.login({
    returnTo: '/'
  });
});

app.get("/sign-up", (req, res) => {
  res.oidc.login({
    returnTo: '/',
    authorizationParams: {      
      screen_hint: "signup",
    },
  });
});

app.post('/toggle-safe-mode', (req, res) => {
  safeMode[req.body.key] = !safeMode[req.body.key]
  texts = [];
  res.status(200)
  res.send()
});

app.post('/submit-text', (req, res) => {
  let text = req.body.text

  if(safeMode[0]) {
    var encrypted = CryptoJS.AES.encrypt(text, "Test", {
      format: JsonFormatter
    });
    console.log(encrypted.toString())
    var decrypted = CryptoJS.AES.decrypt(encrypted, "Test", {
      format: JsonFormatter
    });
    console.log(decrypted.toString())
  } else {
    texts.push(text)
  } 
  res.status(200)
  res.send()
});

if(process.env.PORT) {
  app.listen(port, () => {
    console.log(`Server running at ${process.env.APP_URL}:${port}/`);
  })
} else {
  https.createServer({
    key: fs.readFileSync('server.key'),
    cert: fs.readFileSync('server.cert')
  }, app)
  .listen(port, function () {
    console.log(`Server running at https://localhost:${port}/`);
  });
}

var JsonFormatter = {
  stringify: function(cipherParams) {
    // create json object with ciphertext
    var jsonObj = { ct: cipherParams.cipherText.toString(CryptoJS.enc.Base64)}

    // optionally add iv or salt
    if (cipherParams.iv) {
      jsonObj.iv = cipherParams.iv.toString();
    }

    if (cipherParams.salt) {
      jsonObj.s = cipherParams.salt.toString();
    }

    // stringify json object
    return JSON.stringify(jsonObj)
  },
  parse: function(jsonStr) {ž
    // parse json string
    var jsonObj = JSON.parse(jsonStr);
    
    // extract ciphertext from json object, and create cipher params object
    var cipherParams = CryptoJS.lib.CipherParams.create({
      ciphertext: CryptoJS.enc.Base64.parse(jsonObj.ct)
    });

    // optionally extract iv or salt

    if (jsonObj.iv) {
      cipherParams.iv = CryptoJS.enc.Hex.parse(jsonObj.iv);
    }

    if (jsonObj.s) {
      cipherParams.salt = CryptoJS.enc.Hex.parse(jsonObj.s);
    }

    return cipherParams;
  }
}