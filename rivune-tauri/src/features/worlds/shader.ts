// Stationary ambient light studies: no camera travel, cursor tracking or status pulses.
export const fragment = `
precision highp float;
uniform vec2 resolution;
uniform float time;
uniform float scene;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
float fog(vec2 p){float s=0.,a=.5;for(int i=0;i<4;i++){s+=a*noise(p);p=p*2.03+vec2(2.1,7.3);a*=.5;}return s;}
void main(){
 vec2 p=(gl_FragCoord.xy-resolution*.5)/resolution.y;
 vec3 color=vec3(.029,.039,.052);
 if(scene<.5){
  float horizon=.10;
  float haze=exp(-pow((p.y-horizon)*7.,2.));
  float distant=exp(-pow((p.x-.38)*1.1,2.));
  color+=vec3(.055,.06,.065)*haze;
  color+=vec3(.037,.029,.018)*haze*distant;
  float ridge1=horizon+.035+.025*sin(p.x*3.1)+.013*sin(p.x*7.3+.7)+.009*sin(p.x*13.);
  float ridge2=horizon+.017+.013*sin(p.x*4.2+1.)+.011*sin(p.x*8.7);
  float mountains=(1.-smoothstep(ridge1-.002,ridge1+.002,p.y))*smoothstep(horizon-.035,horizon+.006,p.y);
  color=mix(color,vec3(.038,.047,.059),mountains*.75);
  float nearer=(1.-smoothstep(ridge2-.002,ridge2+.002,p.y))*smoothstep(horizon-.026,horizon+.003,p.y);
  color=mix(color,vec3(.023,.032,.043),nearer*.8);
  float water=(1.-smoothstep(horizon-.065,horizon+.045,p.y));
  float undulation=sin(p.y*57.+sin(p.x*1.8)*1.3+time*.028)*.5+.5;
  float broad=sin(p.y*18.-p.x*.7+time*.016)*.5+.5;
  color=mix(color,vec3(.026,.040,.054)+vec3(.022,.03,.039)*broad+vec3(.011,.017,.022)*undulation,water);
  color+=vec3(.024,.027,.031)*haze*water;
  float path=-.345+sin(p.x*2.2+.6)*.014+sin(p.x*6.-time*.022)*.004;
  float band=exp(-abs(p.y-path)*420.);
  float reflection=exp(-pow((p.x-.35)*1.65,2.));
  float broken=.55+.45*smoothstep(-.6,.9,sin(p.x*9.+time*.025));
  color+=vec3(.25,.26,.27)*band*reflection*broken;
  color+=vec3(.024,.03,.037)*exp(-abs(p.y-path)*32.)*reflection;
  color+=vec3(.016,.020,.025)*pow(undulation,9.)*water*reflection;
 }else if(scene<1.5){
  vec2 q=p*2.+vec2(time*.002,-time*.001);
  float f=fog(q+fog(q*1.4));
  color+=vec3(.17,.19,.21)*pow(f,2.)*exp(-abs(p.y+.17)*2.);
  color+=vec3(.048,.041,.03)*exp(-pow((p.y-.18)*12.,2.));
 }else{
  vec2 c=p-vec2(1.13,-.47);float r=length(c);float edge=abs(r-.9);
  color=vec3(.021,.028,.04);
  color+=vec3(.19,.24,.30)*exp(-edge*130.);
  color+=vec3(.038,.055,.078)*exp(-edge*14.);
  if(r<.897)color=vec3(.011,.017,.024)+vec3(.017,.026,.039)*fog(c*5.);
 }
 color*=1.-.25*smoothstep(.35,1.3,length(p*vec2(.7,1.)));
 gl_FragColor=vec4(color,1.);
}`;
