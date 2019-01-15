//inputs
  let DSVI = 120;    //mL/gTSS
  let L    = 2.9615; //LTSS in pdf (eq 10)
  let Sti  = 1150;   //mgCOD/L
  let A_ST = 1248.6; //m2
  let VR   = 12461;  //m3
  let fq   = 2.4;    //ø

//outputs
  let SSVI = 0.67*DSVI;                     //mg/gTSS
  let V0_n = 67.9*Math.exp(-0.016*SSVI);    //kgTSS/(m2·h)
  let n    = 0.88 - 0.393*Math.log10(V0_n); //m3*kgTSS
  let V0   = n*V0_n;                        //m/h
  let H    = L*Sti*A_ST*0.8*V0*24/(fq*VR*1000);

//solution
  let Xt_solution     = 4.1; //kg/m3
  let Q_ADWF_solution = 15;  //ML/d

//loop
let Xt = H*Math.exp(-n*Xt_solution); //average TSS concentration in reactor

//average dry weather flow capacity
//if the plant is tretating more than Q_ADWF, is overloaded. if is less, the plant is underloaded
let Q_ADWF = VR*Xt/(L*Sti); //ML/d | capacity of the treatment plant. 
console.log({ SSVI, V0_n, n, V0, H, Xt, Q_ADWF });

//f(Xt) = Xt - H*e^(-n*Xt)
//can be also expressed as: H = Xt*e^(n*Xt)
function newton_raphson(x){       //definition of 1 iteration
  let fx = x*Math.exp(n*x)-H;     //f(x)  = x*e^(n*x)-H
  let dx = Math.exp(n*x)*(1+x*n); //f'(x) = e^(n*x)*(1+x*n) (derivative)
  return x-fx/dx;                 //next value for x
}
//test
let x  = 1;                  //initial value for x
let x0 = x;                  //current value for x
let x1 = newton_raphson(x0); //next value for x
let iterations = 0;          //iterations counter
while(true){
  console.log({x0,x1});
  //check if solution has been found or didn't converge
  if(Math.abs(x0-x1) < 0.0000001 || iterations > 1000){ 
    console.log({iterations}); 
    break; //exit the loop
  }else{
    x0 = newton_raphson(x1); //update x0
    x1 = newton_raphson(x0); //update x1
    iterations++;            //add 1 to iterations
  }
}
console.log({X_tave:x1});
