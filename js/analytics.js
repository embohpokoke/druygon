// Druygon Simple Analytics - pageview tracker
(function(){
  try {
    var d = JSON.stringify({
      p: location.pathname,
      r: document.referrer || '',
      s: screen.width + 'x' + screen.height
    });
    new Image().src = '/hit?' + encodeURIComponent(d);
  } catch(e){}
})();
