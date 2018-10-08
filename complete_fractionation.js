/**
  * Framework for complete fractionation
  * for 19th Jul 2018 skype w/ george ekama & lluís corominas & lluís bosch
*/

function calculate_fractions(COD, sCOD, fSus, fSup){
  let USO  = fSus*COD;
  let BSO  = sCOD - USO;
  let pCOD = COD - sCOD;
  let UPO  = fSup*COD;
  let BPO  = pCOD - UPO;
  let bCOD = BPO + BSO;
  let uCOD = UPO + USO;
  let results = { BSO, USO, BPO, UPO};
  console.log(results);
  return results;
}
//calculate_fractions(750, 199, 0.07, 0.15);
//calculate_fractions(450, 199, 0.113, 0.04);

function fractionation(){

  let X_BPO_non_set_inf = 301;   //[Organics] non settleable biodegradable particulate organics
  let X_BPO_set_inf     = 406;   //[Organics] settleable biodegradable particulate organics

  let X_UPO_non_set_inf = 20;    //[Organics] non settleable unbiodegradable particulate organics
  let X_UPO_set_inf     = 130;   //[Organics] settleable unbiodegradable particulate organics

  let X_iSS_set_inf     = 34;    //[Solids]   inorganic suspended solids influent settleable
  let X_iSS_raw_inf     = 100;   //[Solids]   inorganic suspended solids influent raw

  let S_VFA_inf         = 50;    //[Organics] VFA (BSO)
  let S_FBSO_inf        = 186;   //[Organics] fermentable biodegradable soluble organics (BSO)
  let S_USO_inf         = 58;    //[Organics] unbiodegradable soluble organics
  let S_FSA_inf         = 59.6;  //[N]        free saline ammonia influent
  let S_OP_inf          = 14.15; //[P]        orthophosphate influent

  //mass ratios
  let f_CV_VFA  = 1.067, f_C_VFA  = 0.400, f_N_VFA  = 0.0000, f_P_VFA  = 0.0000;
  let f_CV_FBSO = 1.420, f_C_FBSO = 0.471, f_N_FBSO = 0.0231, f_P_FBSO = 0.0068;
  let f_CV_BPO  = 1.523, f_C_BPO  = 0.498, f_N_BPO  = 0.0350, f_P_BPO  = 0.0054;
  let f_CV_UPO  = 1.481, f_C_UPO  = 0.518, f_N_UPO  = 0.1000, f_P_UPO  = 0.0250;
  let f_CV_USO  = 1.493, f_C_USO  = 0.498, f_N_USO  = 0.0258, f_P_USO  = 0.0000;

  //total COD in raw ww
  let Total_COD_raw = 
    S_VFA_inf + 
    S_FBSO_inf + 
    S_USO_inf + 
    X_BPO_non_set_inf + 
    X_BPO_set_inf + 
    X_UPO_non_set_inf + 
    X_UPO_set_inf;

  //total COD in settled ww
  let Total_COD_set = 
    S_VFA_inf + 
    S_FBSO_inf + 
    S_USO_inf +
    X_BPO_non_set_inf + 
    X_UPO_non_set_inf;

  //total C in raw ww
  let Total_C_raw = 
    f_C_VFA  / f_CV_VFA  * S_VFA_inf          +
    f_C_FBSO / f_CV_FBSO * S_FBSO_inf         +
    f_C_USO  / f_CV_USO  * S_USO_inf          +
    f_C_BPO  / f_CV_BPO  * X_BPO_non_set_inf  +
    f_C_BPO  / f_CV_BPO  * X_BPO_set_inf      +
    f_C_UPO  / f_CV_UPO  * X_UPO_non_set_inf  +
    f_C_UPO  / f_CV_UPO  * X_UPO_set_inf      ;

  //total C in settled ww
  let Total_C_set = 
    f_C_VFA  / f_CV_VFA  * S_VFA_inf          +
    f_C_FBSO / f_CV_FBSO * S_FBSO_inf         +
    f_C_USO  / f_CV_USO  * S_USO_inf          +
    f_C_BPO  / f_CV_BPO  * X_BPO_non_set_inf  +
    f_C_UPO  / f_CV_UPO  * X_UPO_non_set_inf;

  //total TKN in raw ww
  let Total_TKN_raw = S_FSA_inf + 
    f_N_VFA  / f_CV_VFA  * S_VFA_inf          +
    f_N_FBSO / f_CV_FBSO * S_FBSO_inf         +
    f_N_USO  / f_CV_USO  * S_USO_inf          +
    f_N_BPO  / f_CV_BPO  * X_BPO_non_set_inf  +
    f_N_BPO  / f_CV_BPO  * X_BPO_set_inf      +
    f_N_UPO  / f_CV_UPO  * X_UPO_non_set_inf  +
    f_N_UPO  / f_CV_UPO  * X_UPO_set_inf      ;

  //total TKN in settled ww
  let Total_TKN_set = S_FSA_inf + 
    f_N_VFA  / f_CV_VFA  * S_VFA_inf          +
    f_N_FBSO / f_CV_FBSO * S_FBSO_inf         +
    f_N_USO  / f_CV_USO  * S_USO_inf          +
    f_N_BPO  / f_CV_BPO  * X_BPO_non_set_inf  +
    f_N_UPO  / f_CV_UPO  * X_UPO_non_set_inf;

  //total TP in raw ww
  let Total_TP_raw = S_OP_inf +
    f_P_VFA  / f_CV_VFA  * S_VFA_inf          +
    f_P_FBSO / f_CV_FBSO * S_FBSO_inf         +
    f_P_USO  / f_CV_USO  * S_USO_inf          +
    f_P_BPO  / f_CV_BPO  * X_BPO_non_set_inf  +
    f_P_BPO  / f_CV_BPO  * X_BPO_set_inf      +
    f_P_UPO  / f_CV_UPO  * X_UPO_non_set_inf  +
    f_P_UPO  / f_CV_UPO  * X_UPO_set_inf      ;

  //total TP in settled ww
  let Total_TP_set = S_OP_inf +
    f_P_VFA  / f_CV_VFA  * S_VFA_inf          +
    f_P_FBSO / f_CV_FBSO * S_FBSO_inf         +
    f_P_USO  / f_CV_USO  * S_USO_inf          +
    f_P_BPO  / f_CV_BPO  * X_BPO_non_set_inf  +
    f_P_UPO  / f_CV_UPO  * X_UPO_non_set_inf;

  //VSS in raw ww
  let Total_VSS_raw =
    X_BPO_non_set_inf / f_CV_BPO +  
    X_BPO_set_inf     / f_CV_BPO +  
    X_UPO_non_set_inf / f_CV_UPO +  
    X_UPO_set_inf     / f_CV_UPO ;    

  //VSS in settled ww
  let Total_VSS_set =
    X_BPO_non_set_inf / f_CV_BPO +  
    X_UPO_non_set_inf / f_CV_UPO ;

  //TSS in raw and settled ww
  let Total_TSS_raw = X_iSS_raw_inf + Total_VSS_raw;
  let Total_TSS_set = X_iSS_set_inf + Total_VSS_set;

  //RESULTS (all in g/m3)
  let results = {
    Total_COD_raw, Total_C_raw, 
    Total_TKN_raw, Total_TP_raw, 
    Total_VSS_raw, Total_TSS_raw, 
    Total_COD_set, Total_C_set, 
    Total_TKN_set, Total_TP_set, 
    Total_VSS_set, Total_TSS_set,
  };
  console.log(results);
  return results;
}
fractionation();
