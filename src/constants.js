/*
 * All kinetic and stoichiometric constants for
 * - Activated Sludge
 * - Nitrification
 * - Denitrification
 * - Bio P Removal (EBPR)
*/

const constants={
  //bio P removal (EBPR)
  b_PAO      : 0.040,  //1/d       | PAO endogenous residue respiration rate at 20ºC
  theta_b_PAO: 1.029,  //ø         | b_PAO temperature correction factor
  f_PAO      : 0.250,  //ø         | PAO endogenous residue fraction
  f_P_X_E    : 0.025,  //gP/gVSS   | fraction of P in endogenous mass (OHO+PAO)
  f_P_X_I    : 0.030,  //gP/gVSS   | P in inert VSS mass (UPO)
  f_VT_PAO   : 0.460,  //gVSS/gTSS | fraction of PAO in TSS
  f_P_iSS    : 0.020,  //gP/giSS   | fraction of P in iSS
  f_iPAO     : 1.300,  //giSS/gVSS
  //f_iPAO has to be calculated (0.15 - 1.3) (1.3 is PAOs full of polyPP)
  //f_iPAO_calculated should be lower than 1.3

  //activated sludge
  YH         : 0.666, //gCOD/gCOD | heterotrophic yield (not affected by temperature)
  bH         : 0.240, //1/d       | heterotrophic endogenous respiration rate at 20ºC
  theta_bH   : 1.029, //ø         | bH temperature correction factor
  k_v20      : 0.070, //L/mgVSS·d | constant for not degraded bCOD (FBSO)
  theta_k_v20: 1.035, //ø         | k_v20 temperature correction factor
  fH         : 0.200, //ø         | heterotrophic endogenous residue fraction
  f_iOHO     : 0.150, //giSS/gVSS | iSS content of OHOs

  //nitrification
  µAm      : 0.450, //1/d       | autotrophic max specific growth rate at 20ºC
  theta_µAm: 1.123, //ø         | µAm temperature correction factor
  K_O      : 0.400, //mgDO/L    | autotrophic DO µA sensitivity constant
  theta_pH : 2.350, //ø         | autotrophic pH sensitivity coefficient
  Ki       : 1.130, //ø         | autotrophic pH inhibition to µA
  Kii      : 0.300, //ø         | autotrophic pH inhibition to µA
  Kmax     : 9.500, //ø         | autotrophic pH inhibition to µA
  YA       : 0.100, //gVSS/gFSA | autotrophic yield
  Kn       : 1.000, //mgN/L     | ammonia half saturation coefficient at 20ºC
  theta_Kn : 1.123, //ø         | Kn temperature correction factor
  bA       : 0.040, //1/d       | autotrophic endogenous respiration rate at 20ºC
  theta_bA : 1.029, //ø         | bA temperature correction factor

  //denitrification
  K1_20   : 0.720, //gN/gVSS·d | at 20ºC page 482 and 113
  theta_K1: 1.200, //ø         | temperature correction factor for K1_20
  K2_20   : 0.101, //gN/gVSS·d | at 20ºC page 482 and 113
  theta_K2: 1.080, //ø         | temperature correction factor for K2_20

  //not used (denitrification)
  //K3_20   : 0.072, //gN/gVSS·d | at 20ºC page 482 and 113
  //theta_K3: 1.029, //ø         | temperature correction factor for K3_20
  //K4_20   : 0.048, //gN/gVSS·d | at 20ºC page 482 and 113
  //theta_K4: 1.029, //ø         | temperature correction factor for K4_20

  info:{
    YH         :{unit:"gCOD/gCOD", tec:"as",  descr:"heterotrophic yield (not affected by temperature)"},
    bH         :{unit:"1/d",       tec:"as",  descr:"heterotrophic endogenous respiration rate at 20ºC"},
    theta_bH   :{unit:"ø",         tec:"as",  descr:"bH temperature correction factor"},
    k_v20      :{unit:"L/mgVSS·d", tec:"as",  descr:"constant for not degraded bCOD (FBSO)"},
    theta_k_v20:{unit:"ø",         tec:"as",  descr:"k_v20 temperature correction factor"},
    fH         :{unit:"ø",         tec:"as",  descr:"heterotrophic endogenous residue fraction"},
    f_iOHO     :{unit:"giSS/gVSS", tec:"as",  descr:"iSS content of OHOs"},
    µAm        :{unit:"1/d",       tec:"nit", descr:"autotrophic max specific growth rate at 20ºC"},
    theta_µAm  :{unit:"ø",         tec:"nit", descr:"µAm temperature correction factor"},
    K_O        :{unit:"mgDO/L",    tec:"nit", descr:"autotrophic DO µA sensitivity constant"},
    theta_pH   :{unit:"ø",         tec:"nit", descr:"autotrophic pH sensitivity coefficient"},
    Ki         :{unit:"ø",         tec:"nit", descr:"autotrophic pH inhibition to µA"},
    Kii        :{unit:"ø",         tec:"nit", descr:"autotrophic pH inhibition to µA"},
    Kmax       :{unit:"ø",         tec:"nit", descr:"autotrophic pH inhibition to µA"},
    YA         :{unit:"gVSS/gFSA", tec:"nit", descr:"autotrophic yield"},
    Kn         :{unit:"mgN/L",     tec:"nit", descr:"ammonia half saturation coefficient at 20ºC"},
    theta_Kn   :{unit:"ø",         tec:"nit", descr:"Kn temperature correction factor"},
    bA         :{unit:"1/d",       tec:"nit", descr:"autotrophic endogenous respiration rate at 20ºC"},
    theta_bA   :{unit:"ø",         tec:"nit", descr:"bA temperature correction factor"},
    K1_20      :{unit:"gN/gVSS·d", tec:"dn",  descr:"DN K1 at 20ºC page 482 and 113"},
    theta_K1   :{unit:"ø",         tec:"dn",  descr:"temperature correction factor for K1_20"},
    K2_20      :{unit:"gN/gVSS·d", tec:"dn",  descr:"DN K2 at 20ºC page 482 and 113"},
    theta_K2   :{unit:"ø",         tec:"dn",  descr:"temperature correction factor for K2_20"},
    //K3_20    :{unit:"gN/gVSS·d", tec:"dn",  descr:"DN K3 at 20ºC page 482 and 113"},
    //theta_K3 :{unit:"ø",         tec:"dn",  descr:"temperature correction factor for K3_20"},
    //K4_20    :{unit:"gN/gVSS·d", tec:"dn",  descr:"DN K4 at 20ºC page 482 and 113"},
    //theta_K4 :{unit:"ø",         tec:"dn",  descr:"temperature correction factor for K4_20"},
    b_PAO      :{unit:"1/d",       tec:"bpr", descr:"PAO endogenous residue respiration rate at 20ºC"},
    theta_b_PAO:{unit:"ø",         tec:"bpr", descr:"b_PAO temperature correction factor"},
    f_PAO      :{unit:"ø",         tec:"bpr", descr:"PAO endogenous residue fraction"},
    f_P_X_E    :{unit:"gP/gVSS",   tec:"bpr", descr:"fraction of P in endogenous mass (OHO+PAO)"},
    f_P_X_I    :{unit:"gP/gVSS",   tec:"bpr", descr:"P in inert VSS mass (UPO)"},
    f_VT_PAO   :{unit:"gVSS/gTSS", tec:"bpr", descr:"fraction of PAO in TSS"},
    f_P_iSS    :{unit:"gP/giSS",   tec:"bpr", descr:"fraction of P in iSS"},
    f_iPAO     :{unit:"giSS/gVSS", tec:"bpr", descr:"iSS content of PAOs"},
  },
};

//export
try{module.exports=constants;}catch(e){}
