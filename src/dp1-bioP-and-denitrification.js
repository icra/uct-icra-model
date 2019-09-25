/*
  modification for denitrification
  when bio P removal
  implementation
*/

let r         = 0;                               //recirculation from anoxic to anaerobic reactor
let T         = 14;                              //ºC
let fx1       = fxm - f_AN;                      //ø
let K2_20_PAO = 0.255;                           //gN/gVSS·d
let K2T_PAO   = K2_20_PAO*Math.pow(1.080, T-20); //gN/gVSS·d
let bHT       = 0.24*Math.pow(1.029,T-20);       //1/d

//new Dp1
let Dp1 = S_FBSO_AN*(1+r)*(1-YH)/2.86 +
  fx1*K2T_PAO*(F_sb_OHO/Q)*(YH/f_CV_OHO)/(1+bHT*Rs);
