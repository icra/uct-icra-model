let plant_inputs={
  Q:            25,        //ML/d      | influent flowrate
  S_VFA:        50,        //mgCOD/L   | influent biodegradable soluble volatile fatty acids
  S_FBSO:       115,       //mgCOD/L   | influent biodegradable soluble fermentable organics
  X_BPO:        440,       //mgCOD/L   | influent biodegradable particulated organics
  X_UPO:        100,       //mgCOD/L   | influent unbiodegradable particulated organics
  S_USO:        45,        //mgCOD/L   | influent unbiodegradable soluble organics
  X_iSS:        60,        //mgiSS/L   | influent inert suspended solids
  S_FSA:        39.1,      //mgN/L     | influent soluble free saline ammonia
  S_OP:         7.28,      //mgP/L     | influent soluble orthoposphate (PO4)
  S_NOx:        0,         //mgN/L     | influent soluble nitrates (NO3) / nitrites (NO2)
  T:            16,        //ºC        | AS  | reactor temperature
  Vp:           8473.3,    //m3        | AS  | reactor volume
  Rs:           15,        //d         | AS  | solids retention time or sludge age
  RAS:          1.0,       //ø         | AS  | SST underflow recycle ratio
  waste_from:   "reactor", //string    | AS  | "reactor" or "sst" | secondary wastage
  pst:          true,      //bool      | PST | enable primary settler (pst)
  fw:           0.005,     //ø         | PST | fraction of Q that goes to primary wastage
  removal_BPO:  42.3352,   //%         | PST | primary settler removal of X_BPO
  removal_UPO:  90.05,     //%         | PST | primary settler removal of X_UPO
  removal_iSS:  75.125,    //%         | PST | primary settler removal of X_iSS
  nit:          true,      //bool      | NIT | enable nitrification (nit)
  SF:           1.25,      //ø         | NIT | safety factor
  fxt:          0.39,      //ø         | NIT | unaerated sludge mass fraction
  DO:           2.0,       //mgO/L     | NIT | DO in the aerobic reactor
  pH:           7.2,       //ø         | NIT | pH
  dn:           true,      //bool      | DN  | enable denitrification (dn)
  IR:           5.4,       //ø         | DN  | internal recirculation ratio (also has the symbol 'a')
  DO_RAS:       1.0,       //mgO/L     | DN  | DO in the underflow recycle
  influent_alk: 250,       //mg/L      | DN  | influent alkalinity (mg/L CaCO3)
  cpr:          true,      //bool      | CPR | enable chemical P removal (cpr)
  mass_FeCl3:   3000,      //kg/d      | CPR | mass of FeCl3 added for P removal
  YH:           0.45,      //gVSS/gCOD | OHO | VSS of OHO yield per COD consumed
  bH:           0.24,      //1/d       | OHO | endogenous respiration rate at 20ºC
  theta_bH:     1.029,     //ø         | OHO | bH temperature correction factor
  fH:           0.20,      //ø         | OHO | OHOs UPO fraction
  f_iOHO:       0.15,      //g_iSS/gX  | OHO | inert solids in biomass
  k_v20:        0.07,      //L/mgVSS·d | OHO | constant for not degraded bCOD (FBSO)
  µAm:          0.45,      //1/d       | ANO | ANOs max growth rate at 20ºC
  theta_µAm:    1.123,     //ø         | ANO | µA temperature correction factor
  K_O:          0.3,       //mgDO/L    | ANO | DO µA sensitivity constant
  theta_pH:     2.35,      //ø         | ANO | ph inhibition for µA (page 471)
  Ki:           1.13,      //ø         | ANO | ph inhibition for µA (page 471)
  Kii:          0.3,       //ø         | ANO | ph inhibition for µA (page 471)
  Kmax:         9.5,       //ø         | ANO | ph inhibition for µA (page 471)
  YA:           0.1,       //gVSS/gFSA | ANO | VSS of ANOs yield per FSA consumed
  theta_YA:     1,         //ø         | ANO | YA temperature correction factor
  Kn:           1.0,       //mg/L      | ANO | as N at 20ºC
  theta_Kn:     1.123,     //          | ANO | Kn temperature correction factor
  bA:           0.04,      //1/d       | ANO | at 20ºC
  theta_bA:     1.029,     //unit?     | ANO | bA temperature correction factor
  K2_20:        0.10,      //gN/gVSS·d | DN  | 20ºC page 482
  theta_K2:     1.080,     //ø         | DN  | temperature correction factor for K2_20
};

let river_inputs={
  wb:           25.880,    //m         | amplada a llera mitjana
  wt:           62.274,    //m         | amplada a bankful mitjana
  Db:           18.45841,  //m         | distància entre llera i bankfull mitjana
  S :           0.0010055, //m/m       | pendent de la llera
  n :           0.0358,    //s/m^1/3   | coeficient de manning
  Li:           2000,      //m         | longitud tram
  Di:           0.6,       //m         | fondària del tram
  Ti:           15,        //ºC        | river temperature
  river_S_VFA:  0,         //mgCOD/L   | river biodegradable soluble volatile fatty acids
  river_S_FBSO: 0,         //mgCOD/L   | river biodegradable soluble fermentable organics
  river_X_BPO:  0,         //mgCOD/L   | river biodegradable particulated organics
  river_X_UPO:  0,         //mgCOD/L   | river unbiodegradable particulated organics
  river_S_USO:  0,         //mgCOD/L   | river unbiodegradable soluble organics
  river_X_iSS:  0,         //mgiSS/L   | river inert suspended solids
  river_S_FSA:  0,         //mgN/L     | river soluble free saline ammonia
  river_S_OP:   0,         //mgP/L     | river soluble orthoposphate (PO4)
  river_S_NOx:  0,         //mgN/L     | river soluble nitrates (NO3) / nitrites (NO2)
  NH4_R_20:     0.0000005, //g/m2·min  | NH4 degradation
  NH4_k:        1,         //g/m3      | NH4 degradation
  PO4_R_20:     0.0000005, //g/m2·min  | PO4 degradation
  PO4_k:        1,         //g/m3      | PO4 degradation
};
