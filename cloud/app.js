// 在 Cloud code 里初始化 Express 框架
var express = require('express');
var xml2js = require('xml2js');
var weixin = require('cloud/weixin.js');
var utils = require('express/node_modules/connect/lib/utils');
// 解析微信的 xml 数据
var xmlBodyParser = function (req, res, next) {
  if (req._body) return next();
  req.body = req.body || {};

  // ignore GET
  if ('GET' == req.method || 'HEAD' == req.method) return next();

  // check Content-Type
  if ('text/xml' != utils.mime(req)) return next();

  // flag as parsed
  req._body = true;

  // parse
  var buf = '';
  req.setEncoding('utf8');
  req.on('data', function(chunk){ buf += chunk });
  req.on('end', function(){  
    xml2js.parseString(buf, function(err, json) {
      if (err) {
          err.status = 400;
          next(err);
      } else {
          req.body = json;
          next();
      }
    });
  });
};
var app = express();
app.use(express.bodyParser());
app.use(xmlBodyParser);

var expressLayouts = require('express-ejs-layouts');
var util = require('util');
var login = require('cloud/login.js');
var mutil = require('cloud/mutil.js');

var renderInfo = mutil.renderInfo;
var config = require('cloud/config.js');
// App 全局配置
app.set('views','cloud/views');   // 设置模板目录
app.set('view engine', 'ejs');    // 设置 template 引擎
var avosExpressHttpsRedirect = require('avos-express-https-redirect');
app.use(avosExpressHttpsRedirect());
app.use(expressLayouts);
var crypto = require('crypto');
var avosExpressCookieSession = require('avos-express-cookie-session');
app.use(express.cookieParser(config.cookieParserSalt));
app.use(avosExpressCookieSession({ 
    cookie: { 
        maxAge: 3600000 
    }, 
    fetchUser: true
}));
app.use(app.router);
// 使用 Express 路由 API 服务 /hello 的 HTTP GET 请求
app.get('/hello', function(req, res) {
  res.render('hello', { message: 'Congrats, you just set up your app!' });
});
app.get('/', function(req, res) {
    res.render('login.ejs');
});
app.get('/login', function(req, res) {

        res.render('login.ejs');

});
app.get('/main', function(req, res) {
	
		var user=AV.User.current();
		if(user){
			res.render('main',{user:user});
		}else{
			res.render('main.ejs');

		}
        
});
app.get('/register', function(req, res) {

        res.render('register.ejs');

});
app.post('/login', function (req, res) {
    var username = req.body.username;
    var password = req.body.password;
    AV.User.logIn(username, password, {
        success: function (user) {
            res.redirect('/main');
        },
        error: function (user, error) {
            mutil.renderError(res, error.message);
        }
    });
});
app.post('/register', function (req, res) {
    var username = req.body.username;
    var password = req.body.password;
    var email = req.body.email;
	var telphone = req.body.email;
    if (username && password && email) {
        var user = new AV.User();
        user.set('username', username);
        user.set('password', password);
        user.set('email', email);
		user.set('telphone', telphone);
        user.signUp(null).then(function (user) {
            login.renderEmailVerify(res, email);
        }, function (error) {
            renderInfo(res, util.inspect(error));
        });
    } else {
        mutil.renderError(res, '不能为空');
    }
});
app.get('/requestEmailVerify', function (req, res) {
    var email = req.query.email;
    AV.User.requestEmailVerfiy(email).then(function () {
        mutil.renderInfo(res, '邮件已发送请查收。');
    }, mutil.renderErrorFn(res));
});
app.post('/test', function (req, res) {
	var result={success:1,message:"ssss"};
	res.json(result);
});
app.post('/testQuery', function (req, res) {
	var TestObject = AV.Object.extend("TestObject");
	var query = new AV.Query(TestObject);
	var rows=req.body.rows;
	var page=req.body.page;
	var total=0;
	query.ascending("objectId");
	query.find({
  success: function(results) {
	total=results.length;
	query.limit(rows);
	query.skip((page-1)*rows);
		query.descending("objectId");
query.find({
  success: function(results) {
	var result={rows:results,total:total};
	res.json(result);
  },
  error: function(error) {
    alert("Error: " + error.code + " " + error.message);
  }
});
  },
  error: function(error) {
    alert("Error: " + error.code + " " + error.message);
  }
});
	
});


app.get('/weixin', function(req, res) {
  console.log('weixin req:', req.query);
  weixin.exec(req.query, function(err, data) {
    if (err) {
      return res.send(err.code || 500, err.message);
    }
    return res.send(data);
  });
})

app.post('/weixin', function(req, res) {
  console.log('weixin req:', req.body);
  weixin.exec(req.body, function(err, data) {
    if (err) {
      return res.send(err.code || 500, err.message);
    }
    var builder = new xml2js.Builder();
    var xml = builder.buildObject(data);
    console.log('res:', data)
    res.set('Content-Type', 'text/xml');
   // return res.send(xml);
    return res.render('register.ejs');
  });
})



// 最后，必须有这行代码来使 express 响应 HTTP 请求
app.listen();