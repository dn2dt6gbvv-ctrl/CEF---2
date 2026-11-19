/* Server adapter for the supplied ShopSelectorModule. Prices/model IDs remain server-authoritative. */
(()=>{'use strict';
const api=window.ShopSelector,native=window.cef,live=!!(native&&typeof native.on==='function'&&typeof native.emit==='function');
const q=new URLSearchParams(location.search),overlay=document.getElementById('ds-overlay'),body=document.getElementById('ds-modal-body'),buttons=document.getElementById('ds-modal-buttons'),title=document.getElementById('ds-modal-title'),waiting=document.getElementById('ds-waiting');
let state=null,familyChoice=0,toastTimer,readyTimer,modalCooldown=0;
const money=n=>Number(n).toLocaleString('ru-RU')+' ₽';
function text(tag,s,cls){const e=document.createElement(tag);e.textContent=s;if(cls)e.className=cls;return e}
function btn(label,op,cls){const b=text('button',label,cls);b.type='button';b.onclick=()=>send(op);return b}
function say(s){const t=document.getElementById('ds-toast');t.textContent=String(s);t.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.hidden=true,6500)}
function send(op){
 if(!state)return false;
 if((state.modal||state.stage===1)&&op!==0&&Date.now()<modalCooldown)return false;
 if(state.modal||state.stage===1)modalCooldown=Date.now()+250;
 if(live)native.emit('ds:action',String(op));else simulate(op);
 return true;
}
function route(p){
 if(!state||state.stage!==2||state.modal)return;
 const map={0:2,1:3,2:4,5:5,6:0};
 if(p.action===3){if(Number.isInteger(p.data)&&p.data>=0&&p.data<7)send(20+p.data);return}
 if(Object.prototype.hasOwnProperty.call(map,p.action))send(map[p.action]);
}
if(live){
 const facade={on:(...a)=>native.on(...a),trigger:(event,payload)=>{if(event==='cef_shop_selector_response')route(payload)},allowPassWindowMessages:o=>{if(typeof native.allowPassWindowMessages==='function')native.allowPassWindowMessages(o)}};
 api.bindCef(facade);
}else window.addEventListener('shop-selector:response',e=>route(e.detail));
function modal(h){title.textContent=h;body.replaceChildren();buttons.replaceChildren();overlay.hidden=false}
function paragraph(s,cls){body.append(text('p',s,cls))}
function pair(yes,op,no,noOp){buttons.append(btn('ENTER  '+yes,op,'ds-yes'),btn('ESC  '+no,noOp,'ds-no'))}
function receive(raw){
 let s=raw;try{if(typeof raw==='string')s=JSON.parse(raw)}catch{return false}
 if(!s||![1,2,3].includes(s.stage))return false;
 const prev=state;state=s;modalCooldown=0;waiting.hidden=true;clearInterval(readyTimer);overlay.hidden=true;
 if(s.stage===2){
  const name=s.name==='Ducati Domosodicki RR'?'Ducati Domosodički RR':s.name;
  api.show({type:0,name,price:s.price,testDrivePrice:s.testPrice,characteristics:[
   {title:'Макс. скорость',value:s.speed,max_value:420,units:'км/ч'},
   {title:'Бензобак',value:s.tank,max_value:s.tank,units:'л.'},
   {title:'Вместимость рыбы',value:s.cargo,max_value:10000,units:'кг'},
   {title:'Привод',value:s.drive,max_value:3,units:'no',string_value:['—','FWD','RWD','4WD'][s.drive]||'—'},
   {title:'Изменение клиренса',value:s.clearance,max_value:1,units:'icon'}
  ]});
  document.querySelectorAll('#shop-selector .color-button').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===s.color)));
  const test=document.querySelector('#shop-selector .button--test-drive'),buy=document.querySelector('#shop-selector .button--buy');
  if(test){test.disabled=!s.trackReady||s.testPrice<=0;test.title=s.trackReady?'':'Трасса не настроена'}
  if(buy)buy.disabled=s.price<=0;
 }else api.hide();
 api.setModalOpen(s.stage===1||!!s.modal);
 if(s.stage===1){modal('Автосалон');paragraph('Вы хотите взглянуть на имеющиеся модели транспорта?');pair('Да',1,'Нет',0)}
 else if(s.modal===1){modal('Тест-драйв');paragraph('Марка и модель: '+s.name,'ds-accent');paragraph('Стоимость: '+money(s.testPrice),'ds-accent');paragraph('Вы будете перемещены на тестовую площадку в отдельном виртуальном мире.');paragraph('Время: '+Math.floor(s.testSeconds/60)+' минут. По окончании вы вернётесь в автосалон. Выход из машины, выезд за границу тестовой зоны или /endtest завершат поездку.');paragraph('Начать тест-драйв?');pair('Да',6,'Нет',9)}
 else if(s.modal===2){
  modal('Покупка транспорта');const choices=text('div','','ds-choices');
  ['Купить как личный транспорт','Купить для семьи'].forEach((label,i)=>{const b=btn((i+1)+'   '+label,i?8:7,'ds-choice'+(i===familyChoice?' selected':''));b.setAttribute('aria-pressed',String(i===familyChoice));b.onclick=()=>{familyChoice=i;receive(state)};choices.append(b)});body.append(choices);
  paragraph('Для семьи покупает только её лидер. Оплата — его наличными.','ds-note');
  const select=btn('ENTER  Выбрать',7,'ds-yes');select.onclick=()=>send(familyChoice?8:7);buttons.append(select,btn('ESC  Назад',9,'ds-no'));
 }else if(s.modal===3){modal('Покупка транспорта');paragraph('Вы действительно хотите приобрести '+s.name+(s.buyKind?' для семьи?':' для личного пользования?'));paragraph('Стоимость: '+money(s.price),'ds-accent');paragraph('Оплата наличными. Выбранный цвет сохранится вместе с транспортом.','ds-note');pair('Да',10,'Нет',9)}
 if(!overlay.hidden){const focus=buttons.querySelector('button');if(focus&&(!prev||prev.stage!==s.stage||prev.modal!==s.modal))focus.focus()}
 api.setReadable(innerWidth<=600);return true;
}
document.addEventListener('keydown',e=>{
 if(!state||overlay.hidden||e.repeat)return;
 if(e.key==='Tab'){
  const list=[...overlay.querySelectorAll('button:not(:disabled)')];if(!list.length)return;
  const a=list[0],z=list[list.length-1];
  if(e.shiftKey&&(document.activeElement===a||!overlay.contains(document.activeElement))){e.preventDefault();z.focus()}
  else if(!e.shiftKey&&(document.activeElement===z||!overlay.contains(document.activeElement))){e.preventDefault();a.focus()}
  return;
 }
 if(e.key==='Escape'){e.preventDefault();send(state.stage===1?0:9);return}
 if(state.modal===2&&['1','2','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();familyChoice=(e.key==='2'||e.key==='ArrowDown')?1:0;receive(state);return}
 if(e.key==='Enter'&&e.target.tagName!=='BUTTON'){e.preventDefault();send(state.stage===1?1:state.modal===1?6:state.modal===2?(familyChoice?8:7):10)}
});
window.addEventListener('resize',()=>api.setReadable(innerWidth<=600));
function simulate(op){
 const s={...state};
 if(op===0){api.hide();overlay.hidden=true;state=null;return}
 if(op===1){s.stage=2;s.modal=0}
 if(op===2||op===3)say('Предпросмотр: модель переключает игровой сервер.');
 if(op>=20&&op<=26)s.color=op-20;
 if(op===4)s.modal=1;if(op===5)s.modal=2;if(op===9)s.modal=0;
 if(op===7||op===8){s.buyKind=op===8?1:0;s.modal=3}
 if(op===6||op===10){s.modal=0;say('Предпросмотр: операция доступна только на игровом сервере.')}
 receive(s);
}
window.DealerUI=Object.freeze({receive,get state(){return state}});
if(live){native.on('ds:state',receive);native.on('ds:message',say);native.emit('ds:ready','');let attempts=0;readyTimer=setInterval(()=>{if(state||++attempts>12){clearInterval(readyTimer);return}native.emit('ds:ready','')},700)}
else{
 document.body.classList.add('preview');waiting.hidden=true;
 const view=Number(q.get('preview'))||2;
 receive({stage:view===1?1:2,modal:view>2?view-2:0,name:'Велосипед Аист',price:10000,testPrice:100,speed:139,tank:0,cargo:100,drive:2,clearance:1,color:0,trackReady:1,testSeconds:300,family:1,buyKind:0});
}
})();
