const express = require('express');
var fs = require('fs')
var https = require('https')
const app = express();

const dotenv = require('dotenv');
dotenv.config();

app.use(express.static('public'))
app.set('view engine', 'ejs');

const { auth, requiresAuth } = require('express-openid-connect'); 
const port = process.env.PORT || 4080;

app.use(express.json())
users = {}

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
    let appUrl = process.env.APP_URL || `https://localhost:${port}/`
    res.render('index', {user : req.user, userString: JSON.stringify(req.user), appUrl});
});

app.get('/private', requiresAuth(), function (req, res) {       
    const user = JSON.stringify(req.oidc.user);
    recentUsers = Object.values(users)
    recentUsers.sort((a,b) => (a.timestamp > b.timestamp) ? 1 : ((b.timestamp > a.timestamp) ? -1 : 0))
    recentUsers = JSON.stringify(recentUsers.slice(0, 5))
    res.render('private', {user, recentUsers});
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

app.post('/store', (req, res) => {
  users[req.body.user] = {
    name: req.body.user,
    timestamp: req.body.timestamp,
    longitude: req.body.longitude,
    latitude: req.body.latitude
  }
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