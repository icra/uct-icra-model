/*
  CAPACITY ESTIMATION MODULE
  reference: "BalancedMLEEquations.pdf"
  Calculates max flowrate (Q_ADWF) and total solids concentration (X_Tave) that
  the plant can process before being overloaded
  - Q_ADWF: average dry weather flow capacity
  - X_Tave: average total solids concentration
  if the plant is tretating more than Q_ADWF, is overloaded. if is less, the
  plant is underloaded
*/

function capacity_estimation(parameters){
  //===========================================================================
  // PARAMETERS
  //===========================================================================
  let Q    = parameters.Q   ; //ML/d          | flowrate
  let X_T  = parameters.X_T ; //kgTSS/m3      | current TSS concentration
  let DSVI = parameters.DSVI; //mL/gTSS       | sludge settleability
  let L    = parameters.L   ; //kgTSS·d/kgCOD | LTSS (eq 10) = MX_T/FSti
  let Sti  = parameters.Sti ; //mgCOD/L       | influent total COD
  let A_ST = parameters.A_ST; //m2            | area of the settler
  let VR   = parameters.VR  ; //m3            | volume of the reactor
  let fq   = parameters.fq  ; //ø             | peak flow (Qmax/Qavg)

  //check undefined parameters
  if(Q   ==undefined) throw new Error(`Q    is undefined`);
  if(X_T ==undefined) throw new Error(`X_T  is undefined`);
  if(DSVI==undefined) throw new Error(`DSVI is undefined`);
  if(L   ==undefined) throw new Error(`L    is undefined`);
  if(Sti ==undefined) throw new Error(`Sti  is undefined`);
  if(A_ST==undefined) throw new Error(`A_ST is undefined`);
  if(VR  ==undefined) throw new Error(`VR   is undefined`);
  if(fq  ==undefined) throw new Error(`fq   is undefined`);

  //check variable types
  if(typeof(Q   )!="number") throw new Error(`Q    is not a number`);
  if(typeof(X_T )!="number") throw new Error(`X_T  is not a number`);
  if(typeof(DSVI)!="number") throw new Error(`DSVI is not a number`);
  if(typeof(L   )!="number") throw new Error(`L    is not a number`);
  if(typeof(Sti )!="number") throw new Error(`Sti  is not a number`);
  if(typeof(A_ST)!="number") throw new Error(`A_ST is not a number`);
  if(typeof(VR  )!="number") throw new Error(`VR   is not a number`);
  if(typeof(fq  )!="number") throw new Error(`fq   is not a number`);

  //numerical checks for physical sense
  if(Q    <  0) throw new Error(`value for Flowrate (Q=${Q}) not allowed`);
  if(X_T  <  0) throw new Error(`value for TSS concentration (X_T=${X_T}) not allowed`);
  if(DSVI <= 0) throw new Error(`value for Sludge settleability (DSVI=${DSVI}) not allowed`);
  if(L    <  0) throw new Error(`value for L=MX_T/FSti (${L}) not allowed`);
  if(Sti  <  0) throw new Error(`value for influent COD (Sti=${Sti}) not allowed`);
  if(A_ST <= 0) throw new Error(`value for area of the settler (A_ST=${A_ST}) not allowed`);
  if(VR   <  0) throw new Error(`value for reactor volume (VR=${VR}) not allowed`);
  if(fq   <  1) throw new Error(`value for peak flow (Qmax/Qavg) (fq=${fq}) not allowed`);

  //equations page 3
  let SSVI = 0.67*DSVI;                         //mg/gTSS      | eq 12
  let V0_n = 67.9*Math.exp(-0.016*SSVI);        //kgTSS/(m2·h) | eq 13
  let n    = 0.88 - 0.393*Math.log10(V0_n);     //m3*kgTSS     | eq 14
  let V0   = n*V0_n;                            //m/h          | eq 15
  let H    = L*Sti*A_ST*0.8*V0*24/(fq*VR*1000); //unit? TODO   | eq 18

  //console.log({DSVI,A_ST,fq});//debug
  //console.log({SSVI,V0_n,n,V0,H});//debug
  //X_Tave (=x) is found using the newton-raphson method
  //f(x) = x - H*e^(-n*x)
  //can be also expressed as: H = x*e^(n*x)
  function newton_raphson(x){       //1 iteration of newton-raphson method
    let fx = x*Math.exp(n*x)-H;     //f(x)  = x*e^(n*x)-H
    let dx = Math.exp(n*x)*(1+x*n); //f'(x) = e^(n*x)*(1+x*n) (derivative)
    return x-fx/dx;                 //next value for x
  }

  //start at X_Tave=1
  let x  = 10;                 //initial value for x
  let x0 = x;                  //current value for x
  let x1 = newton_raphson(x0); //next value for x
  let iterations = 0;          //iterations counter
  while(true){
    //console.log({x0,x1});//debug
    //check if solution has been found or didn't converge
    if(Math.abs(x0-x1) < 0.0000001 || iterations >= 1000){
      //console.log({iterations}); //debug
      break; //exit the loop
    }else{
      x0 = newton_raphson(x1); //update x0
      x1 = newton_raphson(x0); //update x1
      if(isNaN(x1)) x1 = Math.random()*100;
      iterations++;            //add 1 to iterations
    }
  }
  let X_Tave = x1;                   //kgTSS/m3 | take the last iteration of x1
  let Q_ADWF = VR*X_Tave/(L*Sti)||Q; //ML/d     | capacity of the treatment plant

  let results={
    Q     :{value:Q,      unit:"ML/d",     descr:"Actual flowrate"},
    Q_ADWF:{value:Q_ADWF, unit:"ML/d",     descr:"Average dry weather flow"},
    X_T   :{value:X_T,    unit:"kgTSS/m3", descr:"Current TSS concentration in reactor"},
    X_Tave:{value:X_Tave, unit:"kgTSS/m3", descr:"Average TSS concentration in reactor"},
    iterations:{value:iterations, unit:'iterations', descr:'amount of newton-raphson iterations performed to compute X_Tave'},
  }
  //console.log(results);

  //check if plant is overloaded (allow 5% overloaded)
  if(Q   > 1.05*Q_ADWF) throw new Error(`Q (${Q}) > Q_ADWF (${Q_ADWF}): plant overloaded (more than 5%)`);
  if(X_T > 1.05*X_Tave) throw new Error(`X_T (${X_T}) > X_Tave (${X_Tave}): plant overloaded (more than 5%)`);

  return results;
}

//export function
try{module.exports=capacity_estimation;}catch(e){}

/*standalone test*/
(function(){
  return
  console.log(capacity_estimation({
    Q    : 10,     //ML/d
    X_T  : 3.5,    //kgTSS/m3
    DSVI : 120,    //mL/gTSS
    L    : 2.9615, //kgTSS·d/kgCOD
    Sti  : 1150,   //mgCOD/L
    A_ST : 1248.6, //m2
    VR   : 12461,  //m3
    fq   : 2.4,    //ø
  }));
})();
