/**
  * Technology: nitrification
  * Metcalf & Eddy, Wastewater Engineering, 5th ed., 2014:
  * page 762
*/
function nitrification(BOD,bCOD_BOD_ratio,nbVSS,TSS,VSS,Q,T,TKN,SF,zb,Pressure,Df,MLSS_X_TSS,NH4_eff,sBODe,TSSe,Alkalinity,DO){
  /*
    Inputs          example values
    --------------------------------
    BOD             140    g/m3
    bCOD_BOD_ratio  1.6    g bCOD/g BOD
    nbVSS           20     g/m3
    TSS             70     g/m3
    VSS             60     g/m3
    Q               22700  m3/d
    T               12     ºC
    TKN             35     g/m3
    SF              1.5    (unitless)
    zb              500    m
    Pressure        95600  Pa
    Df              4.4    m
    MLSS_X_TSS      3000   g/m3 (design)
    NH4_eff         0.50   g/m3 [NH4 at effluent] (design)
    sBODe           3      g/m3 (design)
    TSSe            10     g/m3 (design)
    Alkalinity      140    g/m3 as CaCO3
    DO              2.0    mg/L
    --------------------------------
  */
  var Ne=NH4_eff;//name change requested. NH4_eff in the book is Ne
  var C_L=DO;//name change requested. Dissolved oxygen (DO) in the book is C_L

  //parameters for aeration
  var alpha = 0.65; //8.b
  var beta  = 0.95; //8.b
  var C_T   = air_solubility_of_oxygen(T,0); //elevation=0 TableE-1, Appendix E, implemented in "utils.js"
  //end

  /*SOLUTION*/

  //calculate bCOD
  var bCOD  = bCOD_BOD_ratio*BOD;

  //9 start nitrification
  var mu_max_AOB_T = mu_max_AOB * Math.pow(1.072,T-20); //1/d
  var b_AOB_T = b_AOB* Math.pow(1.029,T-20); //1/d
  var S_NH4 = Ne; //g/m3
  var mu_AOB = mu_max_AOB_T * (S_NH4/(S_NH4+K_NH4)) * (C_L/(C_L+K_o_AOB)) - b_AOB_T;
  mu_AOB=Math.max(0,mu_AOB);

  //10
  var SRT_theoretical = 1/mu_AOB ||0; //d
  SRT_theoretical = isFinite(SRT_theoretical) ? SRT_theoretical : 0;

  var SRT_design = SF*SRT_theoretical; //d

  //11
  var bHT = bH * Math.pow(1.04, T - 20);  //1/d
  var mu_mT = mu_m * Math.pow(1.07, T - 20); //1/d

  var S0 = bCOD;
  var S = Ks * (1+bHT*SRT_design) / (SRT_design*(mu_mT-bHT)-1) ||0; //g/m3
  S=Math.min(S,S0); //keep the smaller value
  S=Math.max(0,S);  //avoid negative S

  var NOx = 0.80 * TKN; //first aproximation for nitrate, prior to iteration (80% of TKN)

  //biomass first approximation with first NOx concentration aproximation
  var P_X_bio_VSS = (Q*YH*(S0-S)/(1+bHT*SRT_design) + fd*bHT*Q*YH*(S0-S)*SRT_design/(1+bHT*SRT_design) + Q*Yn*NOx/(1+b_AOB_T*SRT_design)) ||0;
  P_X_bio_VSS/=1000; //kg/d

  //12 iteration for finding more accurate value of NOx (nitrogen oxidized to nitrate)
  var NOx = (TKN - Ne - 0.12*P_X_bio_VSS/Q*1000) ||0;

  //recalc PXbioVSS with accurate NOx (one iteration)
  var P_X_bio_VSS = (Q*YH*(S0-S)/(1+bHT*SRT_design) + fd*bHT*Q*YH*(S0-S)*SRT_design/(1+bHT*SRT_design) + Q*Yn*NOx/(1+b_AOB_T*SRT_design)) ||0;
  P_X_bio_VSS/=1000; //kg/d

  //loop for NOx and PXBioVSS calculation
  (function(){
    //console.log("=======================================")
    //console.log("LOOP FOR NOx and PXbioVSS approximation")
    //console.log("=======================================")

    //initialize arrays with current approximated values
    var NOx_array = [NOx];
    var P_X_bio_VSS_array = [P_X_bio_VSS];

    //max difference
    var tolerance = 0.001;

    //loop until difference < tolerance
    var iterations_performed=0;
    while(true){
      //console.log("- new iteration")

      //increase accuracy of NOx from P_X_bio_VSS
      var last_PX = P_X_bio_VSS_array.slice(-1)[0];
      var new_NOx = (TKN - Ne - 0.12*(last_PX)/Q*1000) ||0;
      new_NOx=Math.max(0,new_NOx);

      //increase accuracy of P_X_bio_VSS with new NOx approximation
      var new_PX=(Q*YH*(S0-S)/(1+bHT*SRT_design)+fd*bHT*Q*YH*(S0-S)*SRT_design/(1+bHT*SRT_design)+Q*Yn*(new_NOx)/(1+b_AOB_T*SRT_design))/1000 ||0;
      new_PX=Math.max(0,new_PX);

      NOx_array.push(new_NOx);
      P_X_bio_VSS_array.push(new_PX);
      //console.log("  NOx approximations: "+NOx_array);
      //console.log("  PXbioVSS approximations: "+P_X_bio_VSS_array);

      //length of NOx approximations
      var l = NOx_array.length;
      var difference = Math.abs(NOx_array[l-1]-NOx_array[l-2]);
      if(difference<tolerance){
        NOx         = new_NOx;
        P_X_bio_VSS = new_PX;
        //console.log('NOx & P_X_bio_VSS loop: value is accurate enough (difference: '+difference+')');
        //console.log('=================================');
        break;
      }
      iterations_performed++;

      //break loop if too many iterations
      if(iterations_performed>=50){
        break;
      }
    }
  })();

  //13
  var P_X_VSS = P_X_bio_VSS + Q*nbVSS/1000; //kg/d
  var P_X_TSS = P_X_bio_VSS/0.85 + Q*nbVSS/1000 + Q*(TSS-VSS)/1000; //kg/d
  var X_VSS_V = P_X_VSS * SRT_design; //kg
  var X_TSS_V = P_X_TSS * SRT_design; //kg

  //14
  var V = X_TSS_V*1000 / MLSS_X_TSS ||0; //g/m3
  var tau = V/Q*24 ||0; //h
  var MLVSS = X_VSS_V/X_TSS_V * MLSS_X_TSS ||0; //g/m3

  //15
  var FM = Q*BOD/MLVSS/V ||0; //kg/kg·d
  FM = isFinite(FM) ? FM : 0; //avoid infinite

  var BOD_loading = Q*BOD/V/1000 ||0; //kg/m3·d
  BOD_loading = isFinite(BOD_loading) ? BOD_loading : 0; //avoid infinite

  //16
  var bCOD_removed = Q*(S0-S)/1000; //kg/d
  bCOD_removed=Math.max(0,bCOD_removed); //avoid negative
  var Y_obs_TSS = P_X_TSS/bCOD_removed*bCOD_BOD_ratio ||0; //g_TSS/g_BOD
  var Y_obs_VSS = P_X_TSS/bCOD_removed*(X_VSS_V/X_TSS_V)*bCOD_BOD_ratio ||0; //g_VSS/g_BOD

  //17
  var P_X_bio_VSS_without_nitrifying = Q*YH*(S0-S)/(1+bHT*SRT_design) + fd*bHT*Q*YH*(S0-S)*SRT_design/(1+bHT*SRT_design) ||0; //g/d
  P_X_bio_VSS_without_nitrifying/=1000; //kg/d
  var R0 = Q*(S0-S)/1000 -1.42*P_X_bio_VSS_without_nitrifying + 4.57*Q*NOx/1000; //kg/d
  R0/=24; //kgO2/h
  R0=Math.max(0,R0); //avoid negative

  //18
  var OTRf = R0; //kg/h
  var C_inf_20 = C_s_20 * (1+de*Df/Pa); //mgO2/L
  var Pb = Pa*Math.exp(-g*M*(zb-0)/(R*(273.15+T))); //pressure at plant site (m)
  var SOTR = (OTRf/alpha/F)*(C_inf_20/(beta*C_T/C_s_20*Pb/Pa*C_inf_20-C_L))*(Math.pow(1.024,20-T)); //kg/h
  var kg_O2_per_m3_air = density_of_air(T,Pressure)*0.2318 //oxygen in air by weight is 23.18%, by volume is 20.99%
  var air_flowrate = SOTR/(E*60*kg_O2_per_m3_air) ||0; //m3/min
  air_flowrate = isFinite(air_flowrate) ? air_flowrate : 0; //avoid infinite

  //19 alkalinity
  var alkalinity_added = 0;
  (function(){
    var alkalinity_used_for_nitrification = 7.14*NOx; // g/m3 used as CaCO3 (7.14 is g CaCO3/g NH4-N)
    //70 g/m3 is the residual alkalinity to maintain pH in the range 6.8-7.0;
    //70 = influent_alk - alk_used + alk_added
    alkalinity_added=70-Alkalinity+alkalinity_used_for_nitrification; // g/m3 as CaCO3
    alkalinity_added*=Q/1000;                                         // kg/d as CaCO3
    //alkalinity_added*=(84/50);                                      // kg/d as NaHCO3 (CONVERT FROM CaCO3 TO NaHCO3)
    //106 g of Na2CO3 == 100 g of CaCO3
    // 84 g of NaHCO3 == 100 g of CaCO3 <--use this
    alkalinity_added*=(84/100);                     // kg/d as NaHCO3
    alkalinity_added=Math.max(0, alkalinity_added); // Avoid negative
  })();

  //20 estimate effluent BOD
  var BOD_eff = sBODe + 0.85*0.85*TSSe;
  /*end solution*/

  return {
    mu_max_AOB_T:     {value:mu_max_AOB_T,     unit:"1/d",            descr:"µ_max_AOB corrected by temperature"},
    b_AOB_T:          {value:b_AOB_T,          unit:"1/d",            descr:"b_AOB corrected by temperature"},
    mu_AOB:           {value:mu_AOB,           unit:"1/d",            descr:"µ_AOB Ammonia Oxidizing Bacteria"},
    SRT_theoretical:  {value:SRT_theoretical,  unit:"d",              descr:"SRT_theoretical"},
    SRT_design:       {value:SRT_design,       unit:"d",              descr:"SRT_design"},
    bHT:              {value:bHT,              unit:"1/d",            descr:"bH corrected by temperature"},
    mu_mT:            {value:mu_mT,            unit:"1/d",            descr:"µ_m corrected by temperatureT"},
    S:                {value:S,                unit:"g/m3",           descr:"Effluent substrate concentration"},
    NOx:              {value:NOx,              unit:"g/m3_as_N",      descr:"NOx amount of nitrogen oxidized to nitrate"},
    P_X_bio:          {value:P_X_bio_VSS,      unit:"kg/d",           descr:"Biomass production"},
    P_X_VSS:          {value:P_X_VSS,          unit:"kg/d",           descr:"Net waste activated sludge produced each day"},
    P_X_TSS:          {value:P_X_TSS,          unit:"kg/d",           descr:"Total sludge produced each day"},
    X_VSS_V:          {value:X_VSS_V,          unit:"kg",             descr:"Mass of VSS"},
    X_TSS_V:          {value:X_TSS_V,          unit:"kg",             descr:"Mass of TSS"},
    V_aer:            {value:V,                unit:"m3",             descr:"Aeration tank volume (aerobic)"},
    tau:              {value:tau,              unit:"h",              descr:"Aeration tank detention time"},
    MLVSS:            {value:MLVSS,            unit:"g/m3",           descr:"MLVSS"},
    FM:               {value:FM,               unit:"kg/kg·d",        descr:"Food to biomass ratio (gBOD or bsCOD / g VSS·d)"},
    BOD_loading:      {value:BOD_loading,      unit:"kg/m3·d",        descr:"BOD_loading"},
    bCOD_removed:     {value:bCOD_removed,     unit:"kg/d",           descr:"bCOD_removed"},
    Y_obs_TSS:        {value:Y_obs_TSS,        unit:"g_TSS/g_BOD",    descr:"Observed yield Y_obs_TSS"},
    Y_obs_VSS:        {value:Y_obs_VSS,        unit:"g_VSS/g_BOD",    descr:"Observed yield Y_obs_VSS"},
    C_T:              {value:C_T,              unit:"mg_O2/L",        descr:"Saturated_DO_at_sea_level_and_operating_tempreature"},
    OTRf:             {value:OTRf,             unit:"kg_O2/h",        descr:"O2 demand"},
    C_inf_20:         {value:C_inf_20,         unit:"mg_O2/L",        descr:"Saturated_DO_value_at_sea_level_and_20ºC_for_diffused_aeartion"},
    Pb:               {value:Pb,               unit:"m",              descr:"Pressure at site elevation"},
    SOTR:             {value:SOTR,             unit:"kg_O2/h",        descr:"Standard_Oxygen_Transfer_Rate. The SOTR is the mass of oxygen transferred per unit time into a given volume of water and reported at standard conditions. The European literature also refers to this term as the oxygenation capacity (OC). Note that at standard conditions, the dissolved oxygen concentration is taken as zero thus providing the maximum driving force for transfer."},
    kg_O2_per_m3_air: {value:kg_O2_per_m3_air, unit:"kg_O2/m3",       descr:"kg_O2_per_m3_air"},
    air_flowrate:     {value:air_flowrate,     unit:"m3/min",         descr:"air_flowrate"},
    alkalinity_added: {value:alkalinity_added, unit:"kg/d_as_NaHCO3", descr:"alkalinity_to_be_added"},
    BOD_eff:          {value:BOD_eff,          unit:"g/m3_as_O2",     descr:"BOD_effluent_estimation"},
  };
}

/*test*/
(function(){
  var debug=false;
  if(debug==false)return;
  var BOD             = 140;
  var bCOD_BOD_ratio  = 1.6;
  var nbVSS           = 20;
  var TSS             = 70;
  var VSS             = 60;
  var Q               = 22700;
  var T               = 12;
  var TKN             = 35;
  var SF              = 1.5;
  var zb              = 500;
  var Pressure        = 95600;
  var Df              = 4.4;
  var MLSS_X_TSS      = 3000;
  var NH4_eff         = 0.50;
  var sBODe           = 3;
  var TSSe            = 10;
  var Alkalinity      = 140;
  var DO              = 2.0;
  var result = nitrification(BOD,bCOD_BOD_ratio,nbVSS,TSS,VSS,Q,T,TKN,SF,zb,Pressure,Df,MLSS_X_TSS,NH4_eff,sBODe,TSSe,Alkalinity,DO);
  console.log(result);
})();
