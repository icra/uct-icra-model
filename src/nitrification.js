/*
  AS + Nitrification + SST implementation
  from G. Ekama notes

  Qi → [Activated Sludge + Nitrification + SST] → Qe
                  ↓
                  Qw
*/

//import files
try{
  State_Variables=require("./state-variables.js");
  constants      =require("./constants.js");
  require("./activated-sludge.js");
}catch(e){}

State_Variables.prototype.nitrification=function(T,Vp,Rs,RAS,waste_from,mass_FeCl3,DSVI,A_ST,fq, SF,fxt,DO,pH){
  /*inputs and default values*/
  //as inputs
  T   = isNaN(T  ) ? 16     : T  ; //ºC   | Temperature
  Vp  = isNaN(Vp ) ? 8473.3 : Vp ; //m3   | Volume
  Rs  = isNaN(Rs ) ? 15     : Rs ; //days | Solids retention time
  RAS = isNaN(RAS) ? 1.0    : RAS; //ø    | SST underflow recycle ratio
  waste_from = waste_from || 'reactor'; //"reactor" or "sst"
  if(['reactor','sst'].indexOf(waste_from)==-1) throw `The input "waste_from" must be equal to "reactor" or "sst" (not "${waste_from}")`;
  mass_FeCl3 = isNaN(mass_FeCl3) ? 50 : mass_FeCl3; //kg/d | mass of FeCl3 added for chemical P removal

  //capacity estimation inputs
  DSVI = isNaN(DSVI)? 120    : DSVI; //mL/gTSS | sludge settleability
  A_ST = isNaN(A_ST)? 1248.6 : A_ST; //m2      | area of the settler
  fq   = isNaN(fq  )? 2.4    : fq  ; //ø       | peak flow (Qmax/Qavg)

  //nitrification inputs
  SF  = isNaN(SF ) ? 1.25 : SF ; /* safety factor | Design choice. Increases the sludge age to dampen the effluent ammonia variation
                                    choose a high value for high influent ammonia concentration variation */
  fxt = isNaN(fxt) ? 0.39 : fxt; //ratio         | current unaerated sludge mass fraction
  DO  = isNaN(DO ) ? 2.0  : DO ; //mg/L          | DO in the aerobic reactor
  pH  = isNaN(pH ) ? 7.2  : pH ; //pH units

  //input checks
  if(SF  < 0) throw `Error: Safety factor (SF=${SF}) not allowed`;
  if(fxt < 0) throw `Error: Unaerated sludge mass fraction (fxt=${fxt}) not allowed`;
  if(DO  < 0) throw `Error: Dissolved oxygen in the aerobic reactor (DO=${DO}) not allowed`;

  //influent fractionation
  let frac = this.totals;

  //execute activated sludge without nitrification
  let as = this.activated_sludge(T,Vp,Rs,RAS,waste_from,mass_FeCl3,DSVI,A_ST,fq); //object

  //flowrate
  let Q = this.Q; //ML/d

  //nitrification starts at page 17
  //get necessary TKN fractions
  let Nti   = frac.TKN.total;              //mg/L | total TKN influent
  let Nouse = frac.TKN.usON;               //mg/L | total N_USO_influent = N_USO_effluent
  let Nobse = as.effluent.totals.TKN.bsON; //mg/L | total bsON (from FBSO not degraded)

  //get necessary variables from activated_sludge
  let MX_T = as.process_variables.MX_T.value; //kg   | total sludge produced
  let Ns   = as.process_variables.Ns.value;   //mg/L | N required from sludge production

  //3 - nitrification kinetics
  const µAm = constants.µAm;                //0.450 1/d | auth. max specific growth rate at 20ºC
  const theta_µAm = constants.theta_µAm;    //1.123 1/d | temperature correction factor
  let µAmT  = µAm*Math.pow(theta_µAm,T-20); //1/d       | growth rate corrected by temperature

  //correct µA by DO (book page 468)
  const K_O = constants.K_O;    //0.4 mgDO/L | nitrifier Oxygen sensitivity constant
  let µAmO  = µAmT*DO/(DO+K_O); //1/d    | growth rate corrected by temperature and DO

  //correct µA by pH inhibition
  const theta_pH = constants.theta_pH; //2.35 page 471 and 113
  const Ki       = constants.Ki;       //1.13 page 471 and 113
  const Kii      = constants.Kii;      //0.3  page 471 and 113
  const Kmax     = constants.Kmax;     //9.5  page 471 and 113
  let µAm_pH = µAmO*Math.pow(theta_pH, pH-7.2)*Ki*(Kmax-pH)/(Kmax+Kii-pH); //page 471 and 113

  const YA = constants.YA;              //0.100 gVSS/gFSA | yield coefficient at 20ºC
  const Kn = constants.Kn;              //1.000 mgN/L     | ammonia half saturation coefficient at 20ºC
  const theta_Kn = constants.theta_Kn;  //1.123 mgN/L     | Kn temperature correction factor
  let KnT = Kn*Math.pow(theta_Kn,T-20); //mgN/L           | Kn corrected by temperature

  const bA = constants.bA;               //1/d at 20ºC (endogenous respiration rate)
  const theta_bA = constants.theta_bA;   //bA temperature correction factor
  let bAT  = bA*Math.pow(theta_bA,T-20); //1/d | growth rate corrected by temperature

  //page 17
  //maximum design unaerated sludge mass fraction
  let fxm = 1 - SF*(bAT+1/Rs)/µAm_pH; //ø

  //minimum sludge age for nitrification (Rsm)
  let Rsm = 1/(µAm_pH/SF*(1-fxt)-bAT); //days | reorganized equation for fxm

  //compile Rsm and fxm errors
  let errors=as.errors;
  if(Rs  < Rsm) errors.push("Rs  < Rsm");
  if(fxt > fxm) errors.push("fxt > fxm");

  //unaerated sludge (current and max)
  let MX_T_fxt = fxt*MX_T; //kg TSS | actual uneaerated sludge
  let MX_T_fxm = fxm*MX_T; //kg TSS | max uneaerated sludge

  //effluent ammonia nitrification
  let Nae_fxt = KnT*(bAT + 1/Rs)/(µAm_pH*(1-fxt)-bAT-1/Rs); //mg/L as N | effluent ammonia concentration if fxt <  fxm
  let Nae_fxm = KnT/(SF-1);                                 //mg/L as N | effluent ammonia concentration if fxt == fxm

  //2 checks for effluent ammonia concentration
  let Nae_max = Math.max(0, Nti - Ns - Nouse - Nobse); //will be 0 if Ns > Nti
  if(Nae_fxt < 0)       Nae_fxt = Nae_max;
  if(Nae_fxt > Nae_max) Nae_fxt = Nae_max;

  //effluent TKN nitrification -- page 18
  let Nte_fxt = Nae_fxt + Nouse + Nobse; //mg/L as N | effluent TKN concentration if fxt < fxm
  let Nte_fxm = Nae_fxm + Nouse + Nobse; //mg/L as N | effluent TKN concentration if fxt = fxm

  //nitrification capacity Nc
  let Nc_fxt = Nti - Ns - Nte_fxt; //mg/L as N | Nitrification capacity if fxt < fxm
  let Nc_fxm = Nti - Ns - Nte_fxm; //mg/L as N | Nitrification capacity if fxt = fxm

  //oxygen demand
  let FOn_fxt = 4.57*Q*Nc_fxt; //kgO/d | O demand if fxt < fxm
  let FOn_fxm = 4.57*Q*Nc_fxm; //kgO/d | O demand if fxt = fxm
  let FOc     = as.process_variables.FOc.value; //kg=/d
  let FOt_fxt = FOc + FOn_fxt; //kgO/d | total O demand if fxt < fxm
  let FOt_fxm = FOc + FOn_fxm; //kgO/d | total O demand if fxt = fxm
  let OUR_fxt = FOt_fxt*1000/(Vp*(1-fxt)*24); //mgO/L·h
  let OUR_fxm = FOt_fxm*1000/(Vp*(1-fxm)*24); //mgO/L·h

  //page 475 4.14.22.3 book: calculate mass of nitrifiers
  let f_XBA = YA*Rs/(1+bAT*Rs); //gVSS·d/gFSA
  let MX_BA = Q*Nc_fxt*f_XBA;    //kg VSS
  let X_BA  = MX_BA/Vp;          //kgVSS/m3
  //end nitrification ---------------------

  //prepare nitrification outputs
  let Qe   = as.effluent.Q;                //ML/d
  let Qw   = as.wastage.Q;                 //ML/d
  let Suse = as.effluent.components.S_USO; //mg/L
  let Pse  = as.effluent.components.S_OP;  //mg/L

  //concentration of particulated fractions in wastage
  let iSS_was = as.wastage.components.X_iSS; //mg/L | iSS concentration
  let UPO_was = as.wastage.components.X_UPO; //mg/L | UPO concentration
  let OHO_was = as.wastage.components.X_OHO; //mg/L | BPO concentration

  //FBSO from previous step
  let S_b = as.effluent.components.S_FBSO; //mg/L of bCOD not degraded

  //effluent nitrate: nitrate generated + influent
  let Nne = Nc_fxt + as.effluent.components.S_NOx;

  //output state variables----------(Q   VFA FBSO BPO UPO      USO   iSS      FSA      PO4  NOx  OHO    )
  let effluent = new State_Variables(Qe, 0,  S_b, 0,  0,       Suse, 0,       Nae_fxt, Pse, Nne, 0      );
  let wastage  = new State_Variables(Qw, 0,  S_b, 0,  UPO_was, Suse, iSS_was, Nae_fxt, Pse, Nne, OHO_was);

  //copy influent mass ratios
  effluent.mass_ratios = this.mass_ratios;
  wastage.mass_ratios  = this.mass_ratios;

  //pack nitrification process variables
  let process_variables={
    µAmT     :{value:µAmT,     unit:"1/d",         descr:"Growth rate corrected by temperature"},
    µAmO     :{value:µAmO,     unit:"1/d",         descr:"Growth rate corrected by: temperature + DO available"},
    µAm_pH   :{value:µAm_pH,   unit:"1/d",         descr:"Growth rate corrected by: temperature + DO available + pH"},
    KnT      :{value:KnT,      unit:"mg/L",        descr:"Half saturation constant corrected by temperature"},
    bAT      :{value:bAT,      unit:"1/d",         descr:"Growth rate corrected by temperature"},
    f_XBA    :{value:f_XBA,    unit:"gVSS·d/gCOD", descr:"Nitrifiers Biomass production rate"},
    MX_BA    :{value:MX_BA,    unit:"kgVSS",       descr:"Mass of Nitrifiers"},
    X_BA     :{value:X_BA,     unit:"kgVSS/m3",    descr:"Concentration of Nitrifiers"},
    fxt      :{value:fxt,      unit:"ø",           descr:"Current unaerated sludge mass fraction"},
    fxm      :{value:fxm,      unit:"ø",           descr:"Maximum design unaerated sludge mass fraction"},
    Rs       :{value:Rs ,      unit:"d",           descr:"Current sludge age"},
    Rsm      :{value:Rsm,      unit:"d",           descr:"Minimum sludge age for nitrification (below which theoretically nitrification cannot be achiveved)"},
    //MX_T_fxt :{value:MX_T_fxt, unit:"kgTSS",       descr:"Current uneaerated sludge mass (if fxt < fxm)"},
    //MX_T_fxm :{value:MX_T_fxm, unit:"kgTSS",       descr:"Maximum design uneaerated sludge mass (if fxt = fxm)"},
    Nae      :{value:Nae_fxt,  unit:"mgN/L",       descr:"Effluent ammonia concentration (if fxt < fxm)"},
    //Nae_fxm  :{value:Nae_fxm,  unit:"mgN/L",       descr:"Effluent ammonia concentration (if fxt = fxm)"},
    Nae_max  :{value:Nae_max,  unit:"mgN/L",       descr:"Maximum possible effluent ammonia concentration"},
    //Nte      :{value:Nte_fxt,  unit:"mgN/L",       descr:"Effluent TKN concentration (if fxt < fxm)"},
    //Nte_fxm  :{value:Nte_fxm,  unit:"mgN/L",       descr:"Effluent TKN concentration (if fxt = fxm)"},
    Nc       :{value:Nc_fxt,   unit:"mgN/L",       descr:"Nitrification capacity (if fxt < fxm)"},
    //Nc_fxm   :{value:Nc_fxm,   unit:"mgN/L",       descr:"Nitrification capacity (if fxt = fxm)"},
    FOn      :{value:FOn_fxt,  unit:"kgO/d",       descr:"Nitrogenous Oxygen demand (if fxt < fxm)"},
    //FOn_fxm  :{value:FOn_fxm,  unit:"kgO/d",       descr:"Nitrogenous Oxygen demand (if fxt = fxm)"},
    FOt      :{value:FOt_fxt,  unit:"kgO/d",       descr:"Total Oxygen demand (if fxt < fxm)"},
    //FOt_fxm  :{value:FOt_fxm,  unit:"kgO/d",       descr:"Total Oxygen demand (if fxt = fxm)"},
    OUR      :{value:OUR_fxt,  unit:"mgO/L·h",     descr:"Oxygen Uptake Rate (if fxt < fxm)"},
    //OUR_fxm  :{value:OUR_fxm,  unit:"mgO/L·h",     descr:"Oxygen Uptake Rate (if fxt = fxm)"},
  };

  //hide description (debug)
  //Object.values(process_variables).forEach(obj=>delete obj.descr);
  return {
    process_variables,
    as_process_variables: as.process_variables,
    cpr:                  as.cpr,
    errors,
    effluent,
    wastage,
  };
};

/*test*/
(function(){
  return
  //new influent---------------(Q       VFA FBSO BPO  UPO USO iSS FSA   OP    NOx OHO)
  let inf = new State_Variables(24.875, 50, 115, 255, 10, 45, 15, 39.1, 7.28, 0,  0  );
  //call as+nit--------------(T   Vp      Rs  RAS  waste      mass_FeCl3 SF    fxt   DO   pH)
  let nit = inf.nitrification(16, 8473.3, 15, 1.0, 'reactor', 3000,      1.25, 0.39, 2.0, 7.2);
  //print results
  console.log(nit.process_variables);
  console.log(nit.as_process_variables);
  console.log(nit.cpr);
  return
  console.log("=== AS+NIT effluent summary"); console.log(nit.effluent.summary);
  console.log("=== AS+NIT TKN effluent");     console.log(nit.effluent.totals.TKN);
  console.log("=== AS+NIT wastage summary");  console.log(nit.wastage.summary);
})();
