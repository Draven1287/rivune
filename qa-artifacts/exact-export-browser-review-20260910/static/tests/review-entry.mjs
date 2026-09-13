const query=new URLSearchParams(location.search);
if(query.getAll('scenario').length===1&&['conversation-list','compact-composer','composer-supersession-preview'].includes(query.get('scenario'))&&query.get('preview')==='1'){await import("../assets/hostRenderer-ByHfKtUz.js");}else{document.body.textContent='Choose a documented exact-export synthetic review URL. No host fixture was mounted.';}
