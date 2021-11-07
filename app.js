const express = require('express');
var fs = require('fs')
var https = require('https')
const app = express();

const dotenv = require('dotenv');
dotenv.config();

app.use(express.static('public'))
app.set('view engine', 'ejs');

const { auth, requiresAuth } = require('express-openid-connect'); 
const port = 4080;

app.use(express.json())
users = {}

const config = { 
  authRequired : false,
  idpLogout : true, //login not only from the app, but also from identity provider
  secret: process.env.SECRET,
  baseURL: `https://localhost:${port}`,
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
    res.render('index', {user : req.user, userString: JSON.stringify(req.user)});
});

app.get('/private', requiresAuth(), function (req, res) {       
    const user = JSON.stringify(req.oidc.user);
    recentUsers = Object.values(users)
    recentUsers.sort((a,b) => (a.timestamp > b.timestamp) ? 1 : ((b.timestamp > a.timestamp) ? -1 : 0))
    recentUsers = JSON.stringify(recentUsers.slice(0, 5))
    console.log(recentUsers)
    res.render('private', {user, recentUsers});
});

app.get("/sign-up", (req, res) => {
  res.oidc.login({
    returnTo: '/',
    authorizationParams: {      
      screen_hint: "signup",
    },
  });
});

app.post('/store', (req, res) => {
  console.log(req.body)
  users[req.body.user] = {
    user: req.body.user,
    timestamp: req.body.timestamp,
    longitude: req.body.longitude,
    latitude: req.body.latitude
  }
});

https.createServer({
    key: fs.readFileSync('server.key'),
    cert: fs.readFileSync('server.cert')
  }, app)
  .listen(port, function () {
    console.log(`Server running at https://localhost:${port}/`);
  });