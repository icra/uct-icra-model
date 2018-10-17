/*
 * Technology: BOD removal without nitrification
 * Metcalf & Eddy, Wastewater Engineering, 5th ed., 2014:
 * pages 756-768
 */

State_Variables.prototype.bod_removal=function(BOD,Q,T,SRT,V,zb,Pr,Df,DO){
  //inputs  || default values
  BOD = BOD || 140;   //g/m3 | Total 5d Biochemical Oxygen Demand
  Q   = Q   || 22700; //m3/d | Flowrate
  T   = T   || 12;    //ºC   | Temperature
  SRT = SRT || 5;     //d    | Solids Retention Time
  V   = V   || 3000;  //m3   | Aerobic Volume
  zb  = zb  || 500;   //m    | Site elevation above sea level
  Pr  = Pr  || 95600; //Pa   | Pressure at site elevation
  Df  = Df  || 4.4;   //m    | Liquid depth for aeration basin minus distance between tank bottom and point of air release for the diffusers. For example: 4.9 m - 0.5 m = 4.4 m
  DO  = DO  || 2.0;   //g/m3 | DO in aeration basin (generally: 1.5 to 2)

  //constants
  //Table 8-14, page 755
  const mu_m = 6;    //1/d
  const Ks   = 8;    //g_bCOD/m3
  const YH   = 0.45; //g_VSS/g_bCOD
  const bH   = 0.12; //1/d
  const fd   = 0.15; //unitless
  //aeration parameters
  const g      = 9.81;  //m/s2 (gravity)
  const M      = 28.97; //g/mol (air molecular weight)
  const R      = 8314;  //kg*m2/s2*kmol*K (ideal gases constant*1000)
  const Pa     = 10.33; //m (standard pressure at sea level)
  const alpha  = 0.50;  //8.b
  const beta   = 0.95;  //8.b
  const C_s_20 = 9.09;  //8.b sat DO at sea level at 20ºC
  const F      = 0.90;  //8.b fouling factor
  const de     = 0.40;  //8.b mid-depth correction factor (range: 0.25 - 0.45)
  const E      = 0.35;  //oxygen transfer efficiency

  //fractions at the influent
  let totals = this.compute_totals(); //object | includes: COD, TC, TKN, TP, VSS, TSS
  let COD    = totals.Total_COD;      //g/m3
  let VSS    = totals.VSS[0].VSS;     //g/m3
  let TSS    = totals.Total_TSS;      //g/m3
  let bCOD   = totals.COD[0].bCOD;    //g/m3

  //pCOD = nbpCOD + bpCOD
  let nbpCOD = this.components.X_UPO; //g/m3
  let nbsCOD = this.components.S_USO; //g/m3
  let pCOD   = nbpCOD + this.components.X_BPO; //g/m3

  //ratios
  let bCOD_BOD_ratio = bCOD/BOD; //gbCOD/gBOD
  let COD_BOD_ratio  = COD/BOD;  //usually 1.9-2.0 g COD/g BOD
  let pCOD_VSS_ratio = pCOD/VSS; //2.8 g_pCOD/g_VSS
  let fSus           = 100*(nbsCOD/COD); // USO fraction (%)
  let fSup           = 100*(nbpCOD/COD); // UPO fraction (%)

  //compute nbVSS
  let nbVSS = nbpCOD/pCOD_VSS_ratio; //g/m3

  //part A: bod removal without nitrification
  let mu_mT = mu_m * Math.pow(1.07, T - 20); //1/d
  let bHT   = bH * Math.pow(1.04, T - 20);  //1/d
  let S0    = bCOD; //g/m3
  let S     = Ks*(1+bHT*SRT)/(SRT*(mu_mT-bHT)-1); //g/m3 | bCOD effluent
  S=Math.min(S,S0); //reality check: S cannot be higher than S0
  S=Math.max(0,S);  //reality check: avoid negative S

  //3
  let P_X_bio = (Q*YH*(S0-S)/(1+bHT*SRT)+(fd*bHT*Q*YH*(S0-S)*SRT)/(1+bHT*SRT))/1000; //kg/d
  P_X_bio=Math.max(0,P_X_bio);
  let P_X_VSS = P_X_bio + Q*nbVSS/1000; //kg/d
  let P_X_TSS = P_X_bio/0.85 + Q*nbVSS/1000 + Q*(TSS-VSS)/1000; //kg/d

  //4
  let X_VSS_V    = P_X_VSS*SRT; //kg
  let X_TSS_V    = P_X_TSS*SRT; //kg
  let MLSS_X_TSS = X_TSS_V*1000/V || 0; //g/m3
  let tau        = V*24/Q ||0; //h
  let MLVSS      = X_VSS_V/X_TSS_V * MLSS_X_TSS || 0; //g/m3

  //5
  let FM = Q*BOD/MLVSS/V || 0; //kg/kg·d
  FM = isFinite(FM) ? FM : 0;
  let BOD_loading = Q*BOD/V/1000 || 0; //kg/m3·d
  BOD_loading = isFinite(BOD_loading) ? BOD_loading : 0;

  //6
  let bCOD_removed = Q*(S0-S)/1000; //kg/d
  bCOD_removed=Math.max(0,bCOD_removed); //avoid negative
  let Y_obs_TSS = P_X_TSS/bCOD_removed*bCOD_BOD_ratio ||0; //g_TSS/g_BOD
  let Y_obs_VSS = P_X_TSS/bCOD_removed*(X_VSS_V/X_TSS_V)*bCOD_BOD_ratio ||0; //g_VSS/g_BOD

  //7
  let NOx = 0; //g/m3
  let R0 = (Q*(S0-S)/1000-1.42*P_X_bio)/24 + 0; // kg_O2/h | note: NOx is zero here
  R0=Math.max(0,R0); //avoid negative

  //8
  let C_T              = air_solubility_of_oxygen(T,0); //mg_O2/L -> elevation=0 TableE-1, Appendix E, implemented in "utils.js"
  let Pb               = Pa*Math.exp(-g*M*(zb-0)/(R*(273.15+T))); //m | Pa = pressure at sea level, Pb = pressure at plant
  let C_inf_20         = C_s_20 * (1+de*Df/Pa); //mg_O2/L
  let OTRf             = R0; //kgO2/h
  let SOTR             = (OTRf/(alpha*F))*(C_inf_20/(beta*C_T/C_s_20*Pb/Pa*C_inf_20-DO))*Math.pow(1.024,20-T); //kg/h
  let kg_O2_per_m3_air = density_of_air(T,Pr)*0.2318 //oxygen in air by weight is 23.18%, by volume is 20.99%
  let air_flowrate     = SOTR/(E*60*kg_O2_per_m3_air) ||0; //m3/min
  air_flowrate = isFinite(air_flowrate) ? air_flowrate : 0;
  //end part A

  //TODO BOD removal eliminates the organic biodegradable components TODO
  this.components.S_VFA  = 0; //part of bsCOD  | assume all is consumed
  this.components.S_FBSO = 0; //part of bsCOD  | assume all is consumed
  this.components.X_BPO  = S; //equal to bpCOD | assume is equal to S

  //debug
  console.log("bod_removal("+BOD+","+Q+","+T+","+SRT+","+V+","+zb+","+Pr+","+Df+","+DO+") applied");

  //return results object
  return {
    //ratios
    bCOD_BOD_ratio:   {value:bCOD_BOD_ratio,   unit:"g_bCOD/g_BOD", descr:"bCOD/BOD ratio at influent"},
    COD_BOD_ratio:    {value:COD_BOD_ratio,    unit:"g_COD/g_BOD",  descr:"COD/BOD_ratio"},
    pCOD_VSS_ratio:   {value:pCOD_VSS_ratio,   unit:"g_pCOD/g_VSS", descr:"pCOD/VSS_ratio"},
    fSus:             {value:fSus,             unit:"%",            descr:"Unbiodegradable & soluble fraction (USO/COD)"},
    fSup:             {value:fSup,             unit:"%",            descr:"Unbiodegradable & particulate fraction (UPO/COD)"},
    nbVSS:            {value:nbVSS,            unit:"g/m3",         descr:"Nonbiodegradable_VSS"},
    mu_mT:            {value:mu_mT,            unit:"1/d",          descr:"µ_corrected_by_temperature"},
    bHT:              {value:bHT,              unit:"1/d",          descr:"b_corrected_by_temperature"},
    S0:               {value:S0,               unit:"g/m3",         descr:"substrate (bCOD) initial concentration"},
    S:                {value:S,                unit:"g/m3",         descr:"substrate (bCOD) final concentration"},
    P_X_bio:          {value:P_X_bio,          unit:"kg/d",         descr:"Biomass_production"},
    P_X_VSS:          {value:P_X_VSS,          unit:"kg/d",         descr:"Net waste activated sludge produced each day"},
    P_X_TSS:          {value:P_X_TSS,          unit:"kg/d",         descr:"Total sludge produced each day"},
    X_VSS_V:          {value:X_VSS_V,          unit:"kg",           descr:"Mass of VSS"},
    X_TSS_V:          {value:X_TSS_V,          unit:"kg",           descr:"Mass of TSS"},
    MLSS_X_TSS:       {value:MLSS_X_TSS,       unit:"g/m3",         descr:"Mixed Liquor Suspended Solids"},
    tau:              {value:tau,              unit:"h",            descr:"&tau;_aeration_tank_detention_time"},
    MLVSS:            {value:MLVSS,            unit:"g/m3",         descr:"Mixed Liquor Volatile Suspended Solids"},
    FM:               {value:FM,               unit:"kg/kg·d",      descr:"Food to biomass ratio (gBOD or bsCOD / g VSS·d)"},
    BOD_loading:      {value:BOD_loading,      unit:"kg/m3·d",      descr:"Volumetric_BOD_loading"},
    bCOD_removed:     {value:bCOD_removed,     unit:"kg/d",         descr:"bCOD_removed"},
    Y_obs_TSS:        {value:Y_obs_TSS,        unit:"g_TSS/g_BOD",  descr:"Observed_Yield_Y_obs_TSS"},
    Y_obs_VSS:        {value:Y_obs_VSS,        unit:"g_VSS/g_BOD",  descr:"Observed_Yield_Y_obs_VSS"},
    NOx:              {value:0,                unit:"g/m3_as_N",    descr:"N_oxidized_to_nitrate"},
    C_T:              {value:C_T,              unit:"mg_O2/L",      descr:"Saturated_DO_at_sea_level_and_operating_tempreature"},
    Pb:               {value:Pb,               unit:"m",            descr:"Pressure_at_the_plant_site_based_on_elevation,_m"},
    C_inf_20:         {value:C_inf_20,         unit:"mg_O2/L",      descr:"Saturated_DO_value_at_sea_level_and_20ºC_for_diffused_aeartion"},
    OTRf:             {value:OTRf,             unit:"kg_O2/h",      descr:"O2_demand"},
    SOTR:             {value:SOTR,             unit:"kg_O2/h",      descr:"Standard_Oxygen_Transfer_Rate. The SOTR is the mass of oxygen transferred per unit time into a given volume of water and reported at standard conditions. The European literature also refers to this term as the oxygenation capacity (OC). Note that at standard conditions, the dissolved oxygen concentration is taken as zero thus providing the maximum driving force for transfer."},
    kg_O2_per_m3_air: {value:kg_O2_per_m3_air, unit:"kg_O2/m3",     descr:"kg_O2_for_each_m3_of_air_at_current_temperature_and_pressure"},
    air_flowrate:     {value:air_flowrate,     unit:"m3/min",       descr:"Air_flowrate"},
  };
};

/*test*/
(function(){
  return; //debug
  let sv = new State_Variables();
  let BOD = 589;
  let Q   = 22700;
  let T   = 12;
  let SRT = 5;
  let V   = 3000;
  let zb  = 500;
  let Pr  = 95600;
  let Df  = 4.4;
  let DO  = 2.0;
  console.log(
    sv.bod_removal(BOD,Q,T,SRT,V,zb,Pr,Df,DO)
  );
})();
