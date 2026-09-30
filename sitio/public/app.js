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
})();
