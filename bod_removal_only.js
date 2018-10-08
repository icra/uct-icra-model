/*
 * Technology: BOD removal only
 * Metcalf & Eddy, Wastewater Engineering, 5th ed., 2014:
 * pages 756-768
 */


function bod_removal(Q,T,SRT){return 0}
function bod_removal_only(BOD,nbVSS,TSS,VSS,bCOD_BOD_ratio,Q,T,SRT,MLSS_X_TSS,zb,Pressure,Df,DO){
  /*
    Inputs          example values
    --------------------------------
    BOD             140    g/m3
    nbVSS           20     g/m3 == nbpCOD*VSS/pCOD;
    TSS             70     g/m3
    VSS             60     g/m3
    bCOD_BOD_ratio  1.6    g bCOD/g BOD
    Q               22700  m3/d
    T               12     ºC
    SRT             5      d
    MLSS_X_TSS      3000   g/m3
    zb              500    m
    Pressure        95600  Pa
    Df              4.4    m
    DO              2.0    mg/L
  */
  var C_L=DO;//rename requested. Dissolved oxygen (DO) in the book is C_L

  //aeration parameters
  var alpha = 0.50; //8.b
  var beta  = 0.95; //8.b

  //calculate bCOD from bCOD/BOD ratio
  var bCOD  = bCOD_BOD_ratio*BOD;

  //part A: bod removal without nitrification
  var mu_mT = mu_m * Math.pow(1.07, T - 20); //1/d
  var bHT   = bH * Math.pow(1.04, T - 20);  //1/d
  var S0    = bCOD; //g/m3
  var S     = Ks*(1+bHT*SRT)/(SRT*(mu_mT-bHT)-1); //g/m3
  S=Math.min(S,S0); //keep the smaller value
  S=Math.max(0,S);  //avoid negative S

  var P_X_bio = (Q*YH*(S0 - S) / (1 + bHT*SRT) + (fd*bHT*Q*YH*(S0 - S)*SRT) / (1 + bHT*SRT))/1000; //kg/d
  P_X_bio=Math.max(0,P_X_bio);

  //3
  var P_X_VSS = P_X_bio + Q*nbVSS/1000; //kg/d
  var P_X_TSS = P_X_bio/0.85 + Q*nbVSS/1000 + Q*(TSS-VSS)/1000; //kg/d

  //4
  var X_VSS_V = P_X_VSS*SRT; //kg
  var X_TSS_V = P_X_TSS*SRT; //kg
  var V       = X_TSS_V*1000/MLSS_X_TSS || 0; //m3
  var tau     = V*24/Q ||0; //h
  var MLVSS   = X_VSS_V/X_TSS_V * MLSS_X_TSS || 0; //g/m3

  //5
  var FM = Q*BOD/MLVSS/V || 0; //kg/kg·d
  FM = isFinite(FM) ? FM : 0;

  var BOD_loading = Q*BOD/V/1000 || 0; //kg/m3·d
  BOD_loading = isFinite(BOD_loading) ? BOD_loading : 0;

  //6
  var bCOD_removed = Q*(S0-S)/1000; //kg/d
  bCOD_removed=Math.max(0,bCOD_removed); //avoid negative
  var Y_obs_TSS = P_X_TSS/bCOD_removed*bCOD_BOD_ratio ||0; //g_TSS/g_BOD
  var Y_obs_VSS = P_X_TSS/bCOD_removed*(X_VSS_V/X_TSS_V)*bCOD_BOD_ratio ||0; //g_VSS/g_BOD

  //7
  var NOx = 0; //g/m3
  var R0 = (Q*(S0-S)/1000 -1.42*P_X_bio)/24 + 0; // kg_O2/h note: NOx is zero here
  R0=Math.max(0,R0); //avoid negative

  //8
  var C_T = air_solubility_of_oxygen(T,0); //mg_O2/L -> elevation=0 TableE-1, Appendix E, implemented in "utils.js"
  var Pb = Pa*Math.exp(-g*M*(zb-0)/(R*(273.15+T))); //Pa -> pressure at plant site
  var C_inf_20 = C_s_20 * (1+de*Df/Pa); //mg_O2/L
  var OTRf = R0; //kgO2/h
  var SOTR = (OTRf/(alpha*F))*(C_inf_20/(beta*C_T/C_s_20*Pb/Pa*C_inf_20-C_L))*(Math.pow(1.024,20-T)); //kg/h
  var kg_O2_per_m3_air = density_of_air(T,Pressure)*0.2318 //oxygen in air by weight is 23.18%, by volume is 20.99%
  var air_flowrate = SOTR/(E*60*kg_O2_per_m3_air) ||0; //m3/min
  air_flowrate = isFinite(air_flowrate) ? air_flowrate : 0;
  //end part A

  //return results object
  return {
    mu_mT:             {value:mu_mT,             unit:"1/d",          descr:"µ_corrected_by_temperature"},
    bHT:               {value:bHT,               unit:"1/d",          descr:"b_corrected_by_temperature"},
    S0:                {value:S0,                unit:"g/m3",         descr:"Effluent substrate (bCOD) initial concentration"},
    S:                 {value:S,                 unit:"g/m3",         descr:"Effluent substrate (bCOD) final concentration"},
    P_X_bio:           {value:P_X_bio,           unit:"kg/d",         descr:"Biomass_production"},
    P_X_VSS:           {value:P_X_VSS,           unit:"kg/d",         descr:"Net waste activated sludge produced each day"},
    P_X_TSS:           {value:P_X_TSS,           unit:"kg/d",         descr:"Total sludge produced each day"},
    X_VSS_V:           {value:X_VSS_V,           unit:"kg",           descr:"Mass of VSS"},
    X_TSS_V:           {value:X_TSS_V,           unit:"kg",           descr:"Mass of TSS"},
    V_aer:             {value:V,                 unit:"m3",           descr:"Aeration_tank_Volume_(aerobic)"},
    tau:               {value:tau,               unit:"h",            descr:"&tau;_aeration_tank_detention_time"},
    MLVSS:             {value:MLVSS,             unit:"g/m3",         descr:"Mixed Liquor Volatile Suspended Solids"},
    FM:                {value:FM,                unit:"kg/kg·d",      descr:"Food to biomass ratio (gBOD or bsCOD / g VSS·d)"},
    BOD_loading:       {value:BOD_loading,       unit:"kg/m3·d",      descr:"Volumetric_BOD_loading"},
    bCOD_removed:      {value:bCOD_removed,      unit:"kg/d",         descr:"bCOD_removed"},
    Y_obs_TSS:         {value:Y_obs_TSS,         unit:"g_TSS/g_BOD",  descr:"Observed_Yield_Y_obs_TSS"},
    Y_obs_VSS:         {value:Y_obs_VSS,         unit:"g_VSS/g_BOD",  descr:"Observed_Yield_Y_obs_VSS"},
    NOx:               {value:0,                 unit:"g/m3_as_N",    descr:"N_oxidized_to_nitrate"},
    C_T:               {value:C_T,               unit:"mg_O2/L",      descr:"Saturated_DO_at_sea_level_and_operating_tempreature"},
    Pb:                {value:Pb,                unit:"m",            descr:"Pressure_at_the_plant_site_based_on_elevation,_m"},
    C_inf_20:          {value:C_inf_20,          unit:"mg_O2/L",      descr:"Saturated_DO_value_at_sea_level_and_20ºC_for_diffused_aeartion"},
    OTRf:              {value:OTRf,              unit:"kg_O2/h",      descr:"O2_demand"},
    SOTR:              {value:SOTR,              unit:"kg_O2/h",      descr:"Standard_Oxygen_Transfer_Rate. The SOTR is the mass of oxygen transferred per unit time into a given volume of water and reported at standard conditions. The European literature also refers to this term as the oxygenation capacity (OC). Note that at standard conditions, the dissolved oxygen concentration is taken as zero thus providing the maximum driving force for transfer."},
    kg_O2_per_m3_air:  {value:kg_O2_per_m3_air,  unit:"kg_O2/m3",     descr:"kg_O2_for_each_m3_of_air_at_current_temperature_and_pressure"},
    air_flowrate:      {value:air_flowrate,      unit:"m3/min",       descr:"Air_flowrate"},
  };
}

/*test*/
(function(){
  var debug=false;
  if(debug==false)return;
  var BOD            = 140;
  var nbVSS          = 20;
  var TSS            = 70;
  var VSS            = 60;
  var bCOD_BOD_ratio = 1.6;
  var Q              = 22700;
  var T              = 12;
  var SRT            = 5;
  var MLSS_X_TSS     = 3000;
  var zb             = 500;
  var Pressure       = 95600;
  var Df             = 4.4;
  var DO             = 2.0;
  console.log(
    bod_removal_only(BOD,nbVSS,TSS,VSS,bCOD_BOD_ratio,Q,T,SRT,MLSS_X_TSS,zb,Pressure,Df,DO)
  );
})();
