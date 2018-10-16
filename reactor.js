/**
  * Reactor implementation from G. Ekama hand notes
*/

//(nodejs) import State_Variables class
if(typeof(require)){
  var State_Variables=require("./state-variables.js");
}

State_Variables.prototype.reactor=function(Q, T, Vp, SRT){
  //inputs
  Q   = Q || 24875;   //m3/d | Flowrate
  T   = T || 16;      //ºC   | Temperature
  Vp  = Vp || 8473.3; //m3   | Volume
  SRT = SRT || 15;    //days | Solids retention time

  //2 - page 9
  let iSS    = this.components.X_iSS; //mg_iSS/L
  let totals = this.compute_totals(); //object
  let COD    = totals.Total_COD;      //mg_COD/L
  let BSO    = totals.COD[1].bsCOD;   //mg_COD/L
  let USO    = totals.COD[1].usCOD;   //mg_COD/L
  let BPO    = totals.COD[2].bpCOD;   //mg_COD/L
  let UPO    = totals.COD[2].upCOD;   //mg_COD/L

  //fSus and fSup
  let fSus = USO/COD; //g_USO/g_COD
  let fSup = UPO/COD; //g_UPO/g_COD

  //2.1 - fluxes
  let FSti = Q*COD/1000;                          //kg_COD/d
  let FSbi = FSti*(1-fSus-fSup);                  //kg_bCOD/d | biodegradable COD
  let FXti = FSti*fSup/this.mass_ratios.f_CV_UPO; //kg_VSS/d  | UPO in VSS
  let FiSS = Q*iSS/1000;                          //kg_iSS/d  | iSS flux

  //2.2 - kinetics
  const bH = 0.24;                         //1/d | growth rate at 20ºC
  let bHT  = bH * Math.pow(1.029, T - 20); //1/d | corrected by temperature
  //page 10
  const YH = 0.45;                    //gVSS/gCOD
  let X_BH  = (YH*SRT)/(1+bHT*SRT);   //g_VSS*d/g_COD
  let MX_BH = FSbi * X_BH;            //kg_VSS
  const fH  = 0.20;                   //tabled value
  let MX_EH = fH * bHT * SRT * MX_BH; //kg_VSS
  MX_I = FXti * SRT;                  //kg_VSS
  MX_V = MX_BH + MX_EH + MX_I;        //kg_VSS
  const f_iOHO = 0.15;                //g_iSS/gX
  MX_IO = FiSS*SRT + f_iOHO*MX_BH;    //kg_iSS
  MX_T  = MX_V + MX_IO;               //kg_TSS

  //2.3 - page 11
  let MLSS_X_TSS = MX_T/Vp; //kg/m3 | solids concentration in the SST
  let HRT = Vp/Q*24;        //hours | hydraulic retention time

  //2.4 - page 12
  let Qw = Vp/SRT; //m3/day

  //2.5
  let f_avOHO = MX_BH/MX_V; //mgOHOVSS/mgVSS
  let fi = MX_V/MX_T;       //VSS/TSS ratio
  let f_atOHO = fi*f_avOHO; //mgOHOVSS/mgTSS

  //2.6 Nitrogen
  const fn = 0.10;
  let Ns = fn*MX_V/(SRT*Q)*1000; //mgN/L_influent | N concentration in influent required for sludge production
  let TKN_eff = totals.Total_TKN - Ns;
  let FSA_eff = TKN_eff - totals.ON[1].usON;

  //2.7 - oxygen demand
  let fCV = this.mass_ratios.f_CV_UPO; //1.481
  let FOc = FSbi*((1-fCV*YH)+fCV*(1-fH)*bHT*X_BH); //kg_O/d

  //end
  return {
    Q, T, Vp, SRT,                                    //inputs
    fSus, fSup, FSti, FSbi, FXti, FiSS,               //2.1
    bHT, X_BH, MX_BH, MX_EH, MX_I, MX_V, MX_IO, MX_T, //2.2
    MLSS_X_TSS, HRT,                                  //2.3
    Qw,                                               //2.4
    f_avOHO, fi, f_atOHO,                             //2.5
    Ns, TKN_eff, FSA_eff,                             //2.6
    FOc, //2.7
  };

};

//test
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
console.log( sv.reactor() );
