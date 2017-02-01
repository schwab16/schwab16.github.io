app.get('/test', function(req, res, next) {
  var context = {};
  var apiKey = '213130C1164F29F16CBBA10074759DB0'
  var url = 'https://api.steampowered.com/IEconDOTA2_570/GetHeroes/v0001/?key=' + apiKey;
  request(url, function(err, response, body) {
    if (!err && response.statusCode < 400) {
      context.stuff = body;
      res.render('test', context);
    }
    else {
      if (response) {
        console.log(response.statusCode);
      }
      next(err);
    }
  });
});