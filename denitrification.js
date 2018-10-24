/**
  * Denitrification implementation from G. Ekama hand notes
*/

//import "State_Variables" class
if(typeof(require)!="undefined"){var State_Variables=require("./state-variables.js");}

State_Variables.prototype.denitrification=function(){

  /* inputs */
  Q  = Q  || 24875; //m3/d | Flowrate
  T  = T  || 16;    //ºC   | Temperature
  Rs = Rs || 15;    //days | Solids retention time

  //denitrification starts at page 19

  //3.2 - denitrification kinetics
  const K1_20 = 0.72; //mgNO3-N/mgOHOVSS·d | at 20ºC
  const K2_20 = 0.10; //mgNO3-N/mgOHOVSS·d | at 20ºC
  const K3_20 = 0.10; //mgNO3-N/mgOHOVSS·d | at 20ºC
  const K4_20 = 0.00; //mgNO3-N/mgOHOVSS·d | at 20ºC
  const K1 = K1_20*Math.pow(1.200,T-20); //mgNO3-N/mgOHOVSS·d | corrected by temperature
  const K2 = K2_20*Math.pow(1.080,T-20); //mgNO3-N/mgOHOVSS·d | corrected by temperature
  const K3 = K3_20*Math.pow(1.029,T-20); //mgNO3-N/mgOHOVSS·d | corrected by temperature
  const K4 = K4_20*Math.pow(1.029,T-20); //mgNO3-N/mgOHOVSS·d | corrected by temperature

  let fSb_s = bsCOD/bCOD; //TODO

  //Denitrification potential
  //minimum primary anoxic sludge mass fraction
  //denitrification influence on reactor volume and oxygen demand

  //results
  return {
    K1,K2,K3,K4
    //results
  }
};

/*test*/
  let sv = new State_Variables('reactor');
  sv.components.S_VFA  = 50;
  sv.components.S_FBSO = 115;
  sv.components.X_BPO  = 255;
  sv.components.X_UPO  = 10;
  sv.components.S_USO  = 45;
  sv.components.X_iSS  = 15;
  sv.components.S_FSA  = 39.1;
  sv.components.S_OP   = 7.28;
  sv.components.S_NOx  = 0;
  console.log(sv.denitrification());
