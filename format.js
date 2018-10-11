/*convert number to formated string: i.e. "3.999,4" instead of 3999.4*/
function format(number,digits){
  digits=digits||0;
  if(number<1000)digits=1;
  if(number< 100)digits=2;
  if(number<0.10)digits=3;
  if(number<0.01)digits=4;
  digits++;
  let str=new Intl.NumberFormat('en-EN',{maximumFractionDigits:digits}).format(number);
  return str;
}
