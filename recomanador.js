/*RECOMANADOR*/
//import files
const State_Variables = require('./state-variables.js'); //class State_Variables
const Tram            = require('./tram.js');            //class Tram
require('./primary-settler.js');                         //tecnologia primary_settler    (dins de State Variables)
require('./activated-sludge.js');                        //tecnologia activated_sludge   (dins de State Variables)
require('./nitrification.js');                           //tecnologia nitrification      (dins de State Variables)
require('./denitrification.js');                         //tecnologia denitrification    (dins de State Variables)
require('./chemical-P-removal.js');                      //tecnologia chemical P removal (dins de State Variables)

//influent----------------------(Q,    VFA, FBSO, BPO, UPO, USO, iSS, FSA,  OP,   NOx)
let influent=new State_Variables(25,   50,  115,  440, 100, 45,  60,  39.1, 7.28, 0  );
//units-------------------------(ML/d, --------------------mg/L----------------------)

//tram upstream--(wb,     wt,     Db,       S,         n,         Li,   Di,  Ti)
let tram=new Tram(25.880, 62.274, 18.45841, 0.0010055, 0.0358,    2000, 0.6, 15);
//units----------(m,      m,      m,        m/m,       s/m^(1/3), m,    m,   ºC)

//configuració edar
let conf={pst:false, nit:true, dn:true, cpr:true, river:true};

//paràmetres edar
let i={
  fw           : 0.005,     //ø     | PST | fraction of Q that goes to wastage
  removal_BPO  : 42.3352,   //%     | PST | removal of the component X_BPO
  removal_UPO  : 90.05,     //%     | PST | removal of the component X_UPO
  removal_iSS  : 75.125,    //%     | PST | removal of the component X_iSS
  T            : 16,        //ºC    | AS  | temperature
  Vp           : 8473.3,    //m3    | AS  | reactor volume
  Rs           : 15,        //d     | AS  | solids retention time or sludge age
  RAS          : 1.0,       //ø     | AS  | SST underflow recycle ratio
  waste_from   : "reactor", //option| AS  | waste_from | options {'reactor','sst'}
  SF           : 1.25,      //ø     | NIT | safety factor. design choice. Moves the sludge age
  fxt          : 0.39,      //ø     | NIT | current unaerated sludge mass fraction
  DO           : 2.0,       //mgO/L | NIT | DO in the aerobic reactor
  pH           : 7.2,       //ø     | NIT | pH
  IR           : 5.4,       //ø     | DN  | internal recirculation ratio
  DO_RAS       : 1.0,       //mgO/L | DN  | DO in the underflow recycle
  influent_alk : 250,       //mg/L  | DN  | influent alkalinity (mg/L CaCO3)
  mass_FeCl3   : 3000,      //kg/d  | CPR | mass of FeCl3 added 
};

//degradació riu paràmetres
let deg={
  R_20 :{ NH4:0.0000005, PO4:0.0000005 },
  k    :{ NH4:1,         PO4:1         },
};

//run model
function run_model(influent, tram, conf, i, deg){
  //call primary settler
  let pst;
  if(conf.pst) pst = influent.primary_settler(i.fw, i.removal_BPO, i.removal_UPO, i.removal_iSS);
  else         pst = { effluent:influent, wastage:null };

  //call AS+(NIT)+(DN)
  let as;
  if(conf.dn)       as = pst.effluent.denitrification (i.T,i.Vp,i.Rs,i.RAS,i.waste_from,i.SF,i.fxt,i.DO,i.pH,i.IR,i.DO_RAS,i.influent_alk);
  else if(conf.nit) as = pst.effluent.nitrification   (i.T,i.Vp,i.Rs,i.RAS,i.waste_from,i.SF,i.fxt,i.DO,i.pH);
  else              as = pst.effluent.activated_sludge(i.T,i.Vp,i.Rs,i.RAS,i.waste_from);

  //call CPR
  let cpr;
  if(conf.cpr){
    cpr = as.effluent.chemical_P_removal(i.mass_FeCl3);
    cpr.wastage = as.wastage;
  }
  else cpr = { effluent:as.effluent, wastage:as.wastage };

  //combina efluent depuradora i tram upstream
  let river_mixed = tram.state_variables.combine(cpr.effluent);

  //final del tram de riu
  let river_end = new State_Variables(
    river_mixed.Q,
    0, //VFA
    0, //FBSO
    0, //BPO
    0, //UPO
    0, //USO
    0, //iSS
    tram.Mf(river_mixed.components.S_FSA, deg.R_20.NH4, deg.k.NH4), //FSA
    tram.Mf(river_mixed.components.S_OP,  deg.R_20.PO4, deg.k.PO4), //OP
    0, //NOx
  );

  return {
    NH4: river_end.components.S_FSA, //mg/L amoni  al final del riu
    PO4: river_end.components.S_OP,  //mg/L fosfat al final del riu
    //effluent: cpr.effluent.summary,  //summary effluent
  };
}

//executa model una vegada
let run = run_model(influent, tram, conf, i, deg);
//console.log(run);

//EXECUTA N SIMULACIONS
/* 
  - variar:
    - Rs:         [6, 8, 10, 12, 15, 20, 25, 30, 40]; //temps de residència (d)
    - DO:         [1, 1.5, 2, 2.5];                   //mgO/L
    - RAS:        [0.75:0.10:1.25];                   //ø
    - mass-FeCl3: [TBD];                              //kg/d | lluís c. enviarà valors
    - IR:         no variar, calcular optim i fer servir a cada iteració ('a-opt')
      problema: si canvia el Rs canvia a_opt TODO
  - solució funció objectiu: conjunt inputs que donen un resultat de:
    - NH4 < 0.5 mg/L 
    - PO4 < 0.5 mg/L
    - mostra kg/d fang produït i kgO/d (FOt)
*/

(function run_simulacions(){
  let simulacions = 0;  //simulacions fetes
  let solucions   = []; //combinacions que compleixen els límits de NH4 i PO4

  //variacions de Rs, RAS i DO: 9*6*4 = 216
  [6,    8,    10,   12,   15,   20,  25, 30, 40 ].forEach(Rs =>{ //Rs
  [0.75, 0.85, 0.95, 1.05, 1.15, 1.25            ].forEach(RAS=>{ //RAS
  [1.00, 1.50, 2.00, 2.50                        ].forEach(DO =>{ //DO
                                                                  //mass_FeCl3 TODO
    //varia paràmetres
    i.Rs  = Rs;
    i.RAS = RAS;
    i.DO  = DO;

    //executa simulació "n"
    let run = run_model(influent, tram, conf, i, deg); simulacions++;

    //comprova si aquesta run compleix els límits
    if(run.NH4<0.5 && run.PO4<0.5){
      //afegeix la combinació a "solucions"
      solucions.push({Rs, RAS, DO});
    }
  });});});
  console.log({
    simulacions_fetes:  simulacions,
    combinacions_bones: solucions.length,
  });
  return solucions;
})();
