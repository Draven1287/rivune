export function createSavedResultCopy() {
 let generation=0, text='', busy=false;
 return {
  open(value:string){generation++;text=value;busy=false;},
  close(){generation++;busy=false;},
  async copy(write:(text:string)=>Promise<void>,notify:(state:'copying'|'copied'|'failed')=>void){
   if(busy)return;const attempt=generation,value=text;busy=true;notify('copying');
   try{await write(value);if(attempt===generation)notify('copied');}
   catch{if(attempt===generation)notify('failed');}
   finally{if(attempt===generation)busy=false;}
  }
 };
}
