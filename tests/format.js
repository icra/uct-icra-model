/*convert a number to a string: i.e. 3999.4 turns into "3,999.4"*/
function format(number,digits){
  digits=digits||0;
  let abs_number = Math.abs(number);
  if(abs_number< 100   )digits=1;
  if(abs_number<  10   )digits=2;
  if(abs_number<   1   )digits=3;
  if(abs_number<   0.1 )digits=4;
  if(abs_number<   0.01)digits=5;
  let str=new Intl.NumberFormat('en-EN',{maximumFractionDigits:digits}).format(number);
  return str;
}

String.prototype.prettifyUnit=function(){
  return this
    .replace('m3','m<sup>3</sup>')
    .replace('m2','m<sup>2</sup>')
    .replace('CO3','CO<sub>3</sub>')
    .replace(/_/g,' ')
}
