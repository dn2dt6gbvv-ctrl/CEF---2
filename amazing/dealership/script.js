(() => {
  'use strict';
  const root=document.getElementById('shop-selector');
  const params=new URLSearchParams(location.search);
  const Types=Object.freeze({CAR_DEALERSHIP:0,CAR_RENT:1,CLOTHES_SHOP:2,COMPANY:3});
  const Actions=Object.freeze({MOVE_LEFT:0,MOVE_RIGHT:1,TEST_DRIVE:2,SELECT_COLOR:3,SELECT_ITEM:4,BUY:5,EXIT:6});
  const colors=['#d9d9dc','#8c8c90','#161616','#2e6ee0','#2f9e4f','#c98a2e','#c0392b'];
  let state=null,bridge=null,cooldown=0,keyTime=-Infinity,modalOpen=false,selectedItem=0;
  const bound=new WeakSet();
  const str=v=>v==null?'':String(v);
  const finite=v=>typeof v==='number'&&Number.isFinite(v);
  const clone=v=>JSON.parse(JSON.stringify(v));
  function el(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=str(text);return e;}
  function button(cls,label,action,data){const e=el('button',cls,label);e.type='button';e.onclick=()=>press(action,data);return e;}
  function passthrough(value){if(bridge&&typeof bridge.allowPassWindowMessages==='function')bridge.allowPassWindowMessages({mouse:value});}
  function response(action,data=null){
    if(!state)return false;
    const payload={action,data};
    if(bridge&&typeof bridge.trigger==='function')bridge.trigger('cef_shop_selector_response',payload);
    window.dispatchEvent(new CustomEvent('shop-selector:response',{detail:clone(payload)}));
    if(!bridge){console.info('[ShopSelector demo]',payload);if(action===Actions.EXIT)hide();}
    return true;
  }
  function press(action,data=null){
    if(!state||!Object.values(Actions).includes(action)||Date.now()<cooldown)return false;
    if(action===3&&(!Number.isInteger(data)||data<0||data>=colors.length))return false;
    if(action===4&&(!Number.isInteger(data)||data<0))return false;
    cooldown=Date.now()+500;
    if(action===4)selectedItem=data;
    if(action===3)root.querySelectorAll('.color-button').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===data)));
    return response(action,data);
  }
  function show(raw){
    let v=raw;try{if(typeof v==='string')v=JSON.parse(v);}catch{return false;}
    if(!v||typeof v!=='object'||Array.isArray(v)||!Object.values(Types).includes(v.type))return false;
    state={type:v.type,name:str(v.name),price:finite(v.price)?v.price:null,testDrivePrice:finite(v.testDrivePrice)?v.testDrivePrice:0};
    if(Array.isArray(v.characteristics))state.characteristics=v.characteristics.filter(x=>x&&typeof x==='object').map(x=>({title:str(x.title),value:finite(x.value)?x.value:0,max_value:finite(x.max_value)?x.max_value:0,units:str(x.units),string_value:str(x.string_value)}));
    selectedItem=0;
    const wrap=el('div','wrapper');wrap.append(el('div','wrapper wrapper__background-layer'));
    const header=el('header','header'),selector=el('div','selector'),text=el('div','text');
    const left=button('arrow-left','',0),right=button('arrow-right','',1);
    left.setAttribute('aria-label','Предыдущий товар');right.setAttribute('aria-label','Следующий товар');
    text.append(el('span','title',state.name));
    if(state.price)text.append(el('span','price',state.price.toLocaleString('ru-RU')+' ₽'));
    selector.append(left,text,right);header.append(selector);
    if(state.type!==2&&state.type!==3){const list=el('div','color-list');colors.forEach((color,i)=>{const item=el('div','item'),b=button('color-button','',3,i);b.style.background=color;b.style.color=color;b.setAttribute('aria-label','Цвет '+color);b.setAttribute('aria-pressed','false');item.append(b);list.append(item);});header.append(list);}
    const body=el('section','body');
    if(state.characteristics){const list=el('div','characteristics');list.append(el('span','title','Информация'));
      state.characteristics.forEach(x=>{const item=el('div','item'),t=el('div','text');t.append(el('span','item__title',x.title));item.append(t);const val=el('div','item__value');
        if(x.units==='icon'){
          const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('class','stat-icon');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');
          const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',x.value===1?'M4 12l5 5L20 5':'M5 5l14 14M19 5L5 19');path.setAttribute('fill','none');path.setAttribute('stroke','currentColor');path.setAttribute('stroke-width','3');path.setAttribute('stroke-linecap','square');svg.append(path);val.append(svg);val.setAttribute('aria-label',x.value===1?'Да':'Нет');
        }
        else if(x.units==='no'){const a=el('span');a.append(el('span','',x.string_value));val.append(a);}
        else val.append(el('span','',x.value),el('span','',' '+x.units));
        const bg=el('div','progress-bar'),bar=el('div','progress-bar progress-bar__current-value');
        bar.style.width=(x.max_value>0?Math.max(0,Math.min(100,x.value*100/x.max_value)):100)+'%';item.append(val,bg,bar);list.append(item);
      });body.append(list);
    }
    const footer=el('footer','footer'),exit=el('div','exit-block'),close=button('exit-block__icon','',6);close.append(el('span','glyph','×'));close.setAttribute('aria-label','Выйти');exit.append(close,el('div','hint','Нажмите для выхода или используйте ESC'));
    const nav=el('div','nav-block');for(const a of [0,1]){const b=button('nav-block__icon','',a);b.append(el('span','glyph',a===0?'←':'→'));b.setAttribute('aria-label',a===0?'Предыдущий товар':'Следующий товар');nav.append(b);}nav.append(el('div','hint hint--nav','Для переключения, используйте стрелочки на клавиатуре'));
    const buttons=el('div','buttons');if(state.type===0)buttons.append(button('button button--test-drive','Тест-драйв за '+state.testDrivePrice+' ₽',2));
    buttons.append(button('button button--buy',state.type===1?'Арендовать':'Купить',5));footer.append(exit,nav,buttons);wrap.append(header,body,footer);root.replaceChildren(wrap);root.hidden=false;passthrough(true);return true;
  }
  function hide(){state=null;selectedItem=0;root.hidden=true;root.replaceChildren();passthrough(false);}
  function bindCef(candidate){
    if(!candidate||typeof candidate.on!=='function')return false;
    if(bridge===candidate&&bound.has(candidate))return true;
    hide();bridge=candidate;document.body.classList.remove('preview');
    if(!bound.has(candidate)){candidate.on('cef_shop_selector_show',v=>{if(bridge===candidate)show(v);});candidate.on('cef_shop_selector_hide',()=>{if(bridge===candidate)hide();});bound.add(candidate);}return true;
  }
  function setReadable(v){document.body.classList.toggle('readable',Boolean(v));}
  window.ShopSelector=Object.freeze({show,hide,press,bindCef,setReadable,setModalOpen:v=>{modalOpen=Boolean(v);},Types,Actions,get state(){return state?clone(state):null;},get selectedItem(){return selectedItem;},get hasNativeCef(){return Boolean(bridge);}});
  document.addEventListener('keydown',e=>{
    if(!state||modalOpen||e.isComposing||e.ctrlKey||e.metaKey||e.altKey||e.target.closest('input,textarea,select,[contenteditable="true"]'))return;
    const map={ArrowLeft:0,ArrowRight:1,a:0,A:0,d:1,D:1,Escape:6};const a=map[e.key];if(a===undefined)return;e.preventDefault();
    const now=performance.now();if(now-keyTime<500)return;keyTime=now;response(a);
  });
  window.addEventListener('cef_shop_selector_show',e=>show(e.detail));window.addEventListener('cef_shop_selector_hide',hide);
  setReadable(params.get('readable')==='1');
  if(!bindCef(window.cef)){
    document.body.classList.add('preview');
    if(params.get('demo')!=='0')show({type:0,name:'Велосипед Аист',price:10000,testDrivePrice:100,characteristics:[
      {title:'Макс. скорость',value:139,max_value:420,units:'км/ч'},
      {title:'Бензобак',value:0,max_value:0,units:'л.'},
      {title:'Вместимость рыбы',value:100,max_value:10000,units:'кг'},
      {title:'Привод',value:2,max_value:3,units:'no',string_value:'RWD'},
      {title:'Изменение клиренса',value:0,max_value:1,units:'icon'}
    ]});
  }
})();
