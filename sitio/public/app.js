// Catálogo: filtros por categoría (el HTML ya viene renderizado, esto solo oculta/muestra)
(function(){
  var f=document.querySelector('.filtros');
  if(f){f.addEventListener('click',function(e){
    var b=e.target.closest('button');if(!b)return;
    f.querySelectorAll('button').forEach(function(x){x.setAttribute('aria-pressed',x===b)});
    var c=b.dataset.cat;
    document.querySelectorAll('.prod').forEach(function(p){p.hidden=c!=='todo'&&p.dataset.cat!==c});
  })}
  // Selector de sucursal del hero
  var go=document.getElementById('ir-suc');
  if(go){go.addEventListener('click',function(){
    var v=document.getElementById('suc-sel').value;if(v)location.href='/'+v+'/';
  })}
  // "Pedir online": abre el diálogo con las sucursales
  var d=document.getElementById('pedir');
  document.querySelectorAll('[data-pedir]').forEach(function(a){
    a.addEventListener('click',function(e){if(d&&d.showModal){e.preventDefault();d.showModal()}});
  });
  if(d){d.addEventListener('click',function(e){if(e.target===d||e.target.closest('.cerrar'))d.close()})}
  // "Abierto ahora" según el horario de Argentina
  var els=document.querySelectorAll('.estado[data-h]');
  if(els.length){
    var DS={Sun:0,Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6};
    var mm=function(t){var a=t.split(':');return +a[0]*60+ +a[1]};
    var hh=function(m){return ('0'+Math.floor(m/60)).slice(-2)+':'+('0'+m%60).slice(-2)};
    var f=new Intl.DateTimeFormat('en-US',{timeZone:'America/Argentina/Buenos_Aires',weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
    var p={};f.formatToParts(new Date()).forEach(function(x){p[x.type]=x.value});
    var dia=DS[p.weekday],min=+p.hour*60+ +p.minute;
    var nombres=['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
    els.forEach(function(el){
      var H=JSON.parse(el.dataset.h);
      var tramos=function(d){var r=[];H.forEach(function(h){if(h.d.indexOf(d)>-1)h.t.forEach(function(t){r.push([mm(t[0]),mm(t[1])])})});return r.sort(function(a,b){return a[0]-b[0]})};
      var hoy=tramos(dia),txt='',on=false;
      for(var i=0;i<hoy.length;i++){
        if(min>=hoy[i][0]&&min<hoy[i][1]){on=true;txt='Abierto ahora · hasta las '+hh(hoy[i][1]);break}
        if(min<hoy[i][0]){txt='Cerrado · abre hoy a las '+hh(hoy[i][0]);break}
      }
      if(!txt){for(var k=1;k<=7;k++){var d=(dia+k)%7,t=tramos(d);if(t.length){txt='Cerrado · abre '+(k===1?'mañana':'el '+nombres[d])+' a las '+hh(t[0][0]);break}}}
      el.textContent=txt;el.classList.toggle('on',on);
    });
  }
})();
