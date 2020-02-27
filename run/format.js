/*convert a number to a string: i.e. 3999.4 turns into "3,999.4"*/
//global variable because creating a NumberFormat object is slow
let nf=[
  new Intl.NumberFormat('en-EN', {maximumFractionDigits:0}),
  new Intl.NumberFormat('en-EN', {maximumFractionDigits:1}),
  new Intl.NumberFormat('en-EN', {maximumFractionDigits:2}),
  new Intl.NumberFormat('en-EN', {maximumFractionDigits:3}),
  new Intl.NumberFormat('en-EN', {maximumFractionDigits:4}),
  new Intl.NumberFormat('en-EN', {maximumFractionDigits:5}),
];
function format(number,digits){
  digits=digits||0;
  let abs_number = Math.abs(number);
  if(abs_number< 100   ) digits=1;
  if(abs_number<  10   ) digits=2;
  if(abs_number<   1   ) digits=3;
  if(abs_number<   0.1 ) digits=4;
  if(abs_number<   0.01) digits=5;
  return nf[digits].format(number);
}

String.prototype.prettifyUnit=function(){
  return this
    .replace('CO3','CO<sub>3</sub>')
    .replace('FeCl3','FeCl<sub>3</sub>')
    .replace('NH4','NH<sub>4</sub>')
    .replace('NOx','NO<sub>x</sub>')
    .replace('PO4','PO<sub>4</sub>')
    .replace('m2','m<sup>2</sup>')
    .replace('m3','m<sup>3</sup>')
    .replace(/_/g,' ');
}
