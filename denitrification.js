/*
  AS + Nitrification + Denitrification + SST
  implementation from G. Ekama hand notes
*/

//node imports
if(typeof document == "undefined"){State_Variables=require("./state-variables.js");}

State_Variables.prototype.denitrification=function(T,Rs,fxt){
  /* inputs and default values*/
  Q   = isNaN(Q  ) ? 24875 :Q  ; //m3/d  | Flowrate
  T   = isNaN(T  ) ? 16    :T  ; //ºC    | Temperature
  Rs  = isNaN(Rs ) ? 15    :Rs ; //days  | Solids retention time
  fxt = isNaN(fxt) ? 0.39  :fxt; //ratio | current unaerated sludge mass fraction

  //compute AS+Nit results
  let nit_results = this.nitrification(T,Vp,Rs,SF,fxt,DO);

  //denitrification starts at page 19
  //3.2 - denitrification kinetics
  const K1_20 = 0.72;                       //mgNO3-N/mgOHOVSS·d | at 20ºC
  const K2_20 = 0.10;                       //mgNO3-N/mgOHOVSS·d | at 20ºC
  const K3_20 = 0.10;                       //mgNO3-N/mgOHOVSS·d | at 20ºC
  const K4_20 = 0.00;                       //mgNO3-N/mgOHOVSS·d | at 20ºC
  const K1T   = K1_20*Math.pow(1.200,T-20); //mgNO3-N/mgOHOVSS·d | corrected by temperature
  const K2T   = K2_20*Math.pow(1.080,T-20); //mgNO3-N/mgOHOVSS·d | corrected by temperature
  const K3T   = K3_20*Math.pow(1.029,T-20); //mgNO3-N/mgOHOVSS·d | corrected by temperature
  const K4T   = K4_20*Math.pow(1.029,T-20); //mgNO3-N/mgOHOVSS·d | corrected by temperature

  //3.2
  let frac = this.totals;    //object
  let Sbi  = frac.COD.bCOD;  //mg/L
  let Sbsi = frac.COD.bsCOD; //mg/L
  let fSb_s = Sbsi/Sbi;      //ratio

  //Denitrification potential
  const fCV = this.mass_ratios.f_CV_UPO; //1.481 gUPO/gVSS
  const YH  = 0.45;                      //gVSS/gCOD

  let Dp1RBSO = fSb_s*Sbi*(1-fCV*YH)/2.86; //mgNO3-N/L | influent
  let Dp1BPO  = K2T*fxt*Sbi;               //mgNO3-N/L | influent
  let Dp1 = Dp1RBSO + Dp1BPO;

  //minimum primary anoxic sludge mass fraction
  //denitrification influence on reactor volume and oxygen demand

  //results
  return {
    K1T,K2T,K3T,K4T,
    fSb_s,
    Dp1,
  }
};

/*test*/
(function test(){
  //return;
  let sv = new State_Variables(24.875,50,115,255,10,45,15,39.1,7.28,0);
  console.log(sv.denitrification());
})();
