/*
  capacity estimation of the plant
  reference: "docs/edar/Capacity_estimation/BalancedMLEEquations.pdf"
*/

function capacity_estimation(DSVI, L, Sti, A_ST, VR, fq){
  //inputs
  DSVI = isNaN(DSVI)? 120    : DSVI; //mL/gTSS       | sludge settleability 
  L    = isNaN(L   )? 2.9615 : L   ; //kgTSS·d/kgCOD | LTSS (eq 10) = MX_T/FSti
  Sti  = isNaN(Sti )? 1150   : Sti ; //mgCOD/L       | influent total COD
  A_ST = isNaN(A_ST)? 1248.6 : A_ST; //m2            | area of the settler
  VR   = isNaN(VR  )? 12461  : VR  ; //m3            | volume of the reactor
  fq   = isNaN(fq  )? 2.4    : fq  ; //ø             | peak flow (Qmax/Qavg)

  //equations page 3
  let SSVI = 0.67*DSVI;                         //mg/gTSS      | eq 12
  let V0_n = 67.9*Math.exp(-0.016*SSVI);        //kgTSS/(m2·h) | eq 13
  let n    = 0.88 - 0.393*Math.log10(V0_n);     //m3*kgTSS     | eq 14
  let V0   = n*V0_n;                            //m/h          | eq 15
  let H    = L*Sti*A_ST*0.8*V0*24/(fq*VR*1000); //unit?        | eq 18

  //debug
  console.log({DSVI,A_ST,fq});
  //console.log({SSVI,V0_n,n,V0,H});

  //calculation of Q_ADWF, average dry weather flow capacity
  //if the plant is tretating more than Q_ADWF, is overloaded. if is less, the plant is underloaded

  //f(Xt) = Xt - H*e^(-n*Xt)
  //can be also expressed as: H = Xt*e^(n*Xt)
  function newton_raphson(x){       //1 iteration of newton-raphson method
    let fx = x*Math.exp(n*x)-H;     //f(x)  = x*e^(n*x)-H
    let dx = Math.exp(n*x)*(1+x*n); //f'(x) = e^(n*x)*(1+x*n) (derivative)
    return x-fx/dx;                 //next value for x
  }

  //start at X_tave=1
  let x  = 1;                  //initial value for x
  let x0 = x;                  //current value for x
  let x1 = newton_raphson(x0); //next value for x
  let iterations = 0;          //iterations counter
  while(true){
    //console.log({x0,x1}); //debug
    //check if solution has been found or didn't converge
    if(Math.abs(x0-x1) < 0.0000001 || iterations > 1000){ 
      //console.log({iterations}); //debug
      break; //exit the loop
    }else{
      x0 = newton_raphson(x1); //update x0
      x1 = newton_raphson(x0); //update x1
      iterations++;            //add 1 to iterations
    }
  }
  let X_tave = x1;                //kgTSS/m3 | take the last iteration of x1
  let Q_ADWF = VR*X_tave/(L*Sti); //ML/d     | capacity of the treatment plant
  return {
    iterations, //iterations done to compute X_tave
    X_tave:{value:X_tave, unit:"kgTSS/m3", descr:"Average TSS conccentration in reactor"},
    Q_ADWF:{value:Q_ADWF, unit:"ML/d",     descr:"Average dry weather flow"},
  }
}

//export function
try{module.exports=capacity_estimation;}catch(e){}

/*standalone test*/
(function(){
  return;
  console.log(capacity_estimation(/*default values*/));
})();
