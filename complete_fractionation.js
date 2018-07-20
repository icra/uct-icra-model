/**
  * Framework for complete fractionation
  * for 19th Jul 2018 skype w/ george ekama & lluís corominas & lluís bosch
  */

function calculate_fractions(COD, sCOD, fSus, fSup){
  var USO  = fSus*COD;
  var BSO  = sCOD - USO;
  var pCOD = COD - sCOD;
  var UPO  = fSup*COD;
  var BPO  = pCOD - UPO;
  var bCOD = BPO + BSO;
  var uCOD = UPO + USO;

  var results = { BSO, USO, BPO, UPO};
  console.log(results);
  return results;
}
//calculate_fractions(750, 199, 0.07, 0.15);
//calculate_fractions(450, 199, 0.113, 0.04);

//variables that we can measure:
/*
  Total_COD_raw 
  Total_COD_set
  S_VFA_inf

  Total_TKN_raw 
  Total_TKN_set 
  S_FSA_inf

  Total_TP_raw  
  Total_TP_set
  S_OP_inf

  Total_VSS_raw 
  Total_VSS_set
  Total_TSS_raw 
  Total_TSS_set
  X_iSS_inf_raw
  X_iSS_inf_set

  Total_C_set (?)
  Total_C_raw (?)  

  alkalinity (?)
*/

function fractionation(){
  //state variables
  var S_VFA_inf         = 50;    //VFA influent
  var S_FBSO_inf        = 186;   //fermentable biodegradable soluble organics influent
  var S_USO_inf         = 58;    //unbiodegradable soluble organics influent
  var X_BPO_non_set_inf = 301;   //non settleable biodegradable particulate organics influent
  var X_BPO_set_inf     = 406;   //settleable biodegradable particulate organics influent
  var X_UPO_non_set_inf = 20;    //non settleable unbiodegradable particulate organics influent
  var X_UPO_set_inf     = 130;   //settleable unbiodegradable particulate organics influent
  var X_iSS_inf_raw     = 100;   //inorganic suspended solids influent raw
  var X_iSS_inf_set     = 34;    //inorganic suspended solids influent settleable
  var S_FSA_inf         = 59.6;  //free saline ammonia influent
  var S_OP_inf          = 14.15; //orthophosphate influent

  /*mass ratios for VFA, FBSO, USO, BPO{set,non}, UPO{set,non} influent*/
  //1. VFA
  var f_CV_VFA = 1.067; //COD to mass ratio of VFA
  var  f_C_VFA = 0.4;   //C   to mass ratio of VFA
  var  f_N_VFA = 0;     //N   to mass ratio of VFA
  var  f_P_VFA = 0;     //P   to mass ratio of VFA
  //2. FBSO
  var f_CV_FBSO = 1.42;   //COD to mass ratio of FBSO
  var  f_C_FBSO = 0.471;  //C   to mass ratio of FBSO
  var  f_N_FBSO = 0.0231; //N   to mass ratio of FBSO
  var  f_P_FBSO = 0.0068; //P   to mass ratio of FBSO
  //3. USO
  var f_CV_USO = 1.493;  //COD to mass ratio of USO
  var  f_C_USO = 0.498;  //C   to mass ratio of USO
  var  f_N_USO = 0.0258; //N   to mass ratio of USO
  var  f_P_USO = 0.0;    //P   to mass ratio of USO
  //4. BPO non set
  var f_CV_BPO_non_set = 1.523;  //COD to mass ratio of BPO non set
  var  f_C_BPO_non_set = 0.498;  //C   to mass ratio of BPO non set
  var  f_N_BPO_non_set = 0.035;  //N   to mass ratio of BPO non set
  var  f_P_BPO_non_set = 0.0054; //P   to mass ratio of BPO non set
  //5. BPO set
  var f_CV_BPO_set = f_CV_BPO_non_set; //COD to mass ratio of BPO set
  var  f_C_BPO_set = f_C_BPO_non_set;  //C   to mass ratio of BPO set
  var  f_N_BPO_set = f_N_BPO_non_set;  //N   to mass ratio of BPO set
  var  f_P_BPO_set = f_P_BPO_non_set;  //P   to mass ratio of BPO set
  //6. UPO non set
  var f_CV_UPO_non_set = 1.481; //COD to mass ratio of UPO non set
  var  f_C_UPO_non_set = 0.518; //C   to mass ratio of UPO non set
  var  f_N_UPO_non_set = 0.10;  //N   to mass ratio of UPO non set
  var  f_P_UPO_non_set = 0.025; //P   to mass ratio of UPO non set
  //7. UPO set
  var f_CV_UPO_set = f_CV_UPO_non_set; //COD to mass ratio of UPO set
  var  f_C_UPO_set = f_C_UPO_non_set;  //C   to mass ratio of UPO set
  var  f_N_UPO_set = f_N_UPO_non_set;  //N   to mass ratio of UPO set
  var  f_P_UPO_set = f_P_UPO_non_set;  //P   to mass ratio of UPO set

  //total COD in raw ww
  var Total_COD_raw = S_VFA_inf + 
    S_FBSO_inf + 
    S_USO_inf + 
    X_BPO_non_set_inf + 
    X_BPO_set_inf + 
    X_UPO_non_set_inf + 
    X_UPO_set_inf;

  //total C in raw ww
  var Total_C_raw = 
    f_C_VFA         / f_CV_VFA         * S_VFA_inf          +
    f_C_FBSO        / f_CV_FBSO        * S_FBSO_inf         +
    f_C_USO         / f_CV_USO         * S_USO_inf          +
    f_C_BPO_non_set / f_CV_BPO_non_set * X_BPO_non_set_inf  +
    f_C_BPO_set     / f_CV_BPO_set     * X_BPO_set_inf      +
    f_C_UPO_non_set / f_CV_UPO_non_set * X_UPO_non_set_inf  +
    f_C_UPO_set     / f_CV_UPO_set     * X_UPO_set_inf;

  //total TKN in raw ww
  var Total_TKN_raw = S_FSA_inf + 
    f_N_VFA         / f_CV_VFA         * S_VFA_inf          +
    f_N_FBSO        / f_CV_FBSO        * S_FBSO_inf         +
    f_N_USO         / f_CV_USO         * S_USO_inf          +
    f_N_BPO_non_set / f_CV_BPO_non_set * X_BPO_non_set_inf  +
    f_N_BPO_set     / f_CV_BPO_set     * X_BPO_set_inf      +
    f_N_UPO_non_set / f_CV_UPO_non_set * X_UPO_non_set_inf  +
    f_N_UPO_set     / f_CV_UPO_set     * X_UPO_set_inf;

  //total TP in raw ww
  var Total_TP_raw = S_OP_inf +
    f_P_VFA         / f_CV_VFA         * S_VFA_inf          +
    f_P_FBSO        / f_CV_FBSO        * S_FBSO_inf         +
    f_P_USO         / f_CV_USO         * S_USO_inf          +
    f_P_BPO_non_set / f_CV_BPO_non_set * X_BPO_non_set_inf  +
    f_P_BPO_set     / f_CV_BPO_set     * X_BPO_set_inf      +
    f_P_UPO_non_set / f_CV_UPO_non_set * X_UPO_non_set_inf  +
    f_P_UPO_set     / f_CV_UPO_set     * X_UPO_set_inf;

  //total COD in settled ww
  var Total_COD_set = S_VFA_inf + S_FBSO_inf + S_USO_inf + X_BPO_non_set_inf + X_UPO_non_set_inf;

  //total C in settled ww
  var Total_C_set = 
    f_C_VFA         / f_CV_VFA         * S_VFA_inf          +
    f_C_FBSO        / f_CV_FBSO        * S_FBSO_inf         +
    f_C_USO         / f_CV_USO         * S_USO_inf          +
    f_C_BPO_non_set / f_CV_BPO_non_set * X_BPO_non_set_inf  +
    f_C_UPO_non_set / f_CV_UPO_non_set * X_UPO_non_set_inf;

  //total TKN in settled ww
  var Total_TKN_set = S_FSA_inf + 
    f_N_VFA         / f_CV_VFA         * S_VFA_inf          +
    f_N_FBSO        / f_CV_FBSO        * S_FBSO_inf         +
    f_N_USO         / f_CV_USO         * S_USO_inf          +
    f_N_BPO_non_set / f_CV_BPO_non_set * X_BPO_non_set_inf  +
    f_N_UPO_non_set / f_CV_UPO_non_set * X_UPO_non_set_inf;

  //total TP in settled ww
  var Total_TP_set = S_OP_inf +
    f_P_VFA         / f_CV_VFA         * S_VFA_inf          +
    f_P_FBSO        / f_CV_FBSO        * S_FBSO_inf         +
    f_P_USO         / f_CV_USO         * S_USO_inf          +
    f_P_BPO_non_set / f_CV_BPO_non_set * X_BPO_non_set_inf  +
    f_P_UPO_non_set / f_CV_UPO_non_set * X_UPO_non_set_inf;

  //VSS in raw ww
  var Total_VSS_raw =
    X_BPO_non_set_inf / f_CV_BPO_non_set  +  
    X_BPO_set_inf     / f_CV_BPO_set      +  
    X_UPO_non_set_inf / f_CV_UPO_non_set  +  
    X_UPO_set_inf     / f_CV_UPO_set;

  //VSS in settled ww
  var Total_VSS_set =
    X_BPO_non_set_inf / f_CV_BPO_non_set  +  
    X_UPO_non_set_inf / f_CV_UPO_non_set;

  //TSS in raw and settled ww
  var Total_TSS_raw = X_iSS_inf_raw + Total_VSS_raw;
  var Total_TSS_set = X_iSS_inf_set + Total_VSS_set;

  //RESULTS (all in g/m3)
  var results = {
    Total_COD_raw, Total_C_raw,   Total_TKN_raw, Total_TP_raw,
    Total_COD_set, Total_C_set,   Total_TKN_set, Total_TP_set,
    Total_VSS_raw, Total_VSS_set, Total_TSS_raw, Total_TSS_set,
  };
  console.log(results);
  return results;
}
//fractionation();
