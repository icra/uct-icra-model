/*
  Definició d'un escenari complet: xarxa de trams de riu amb depuradores
  7 trams i una EDAR al tram 5

          EDAR
  t1--+     |
      |--> t5--+
  t2--+        |
                +--> t7
  t3--+        |
      |--> t6--+
  t4--+

*/

//Carrega arxius necessaris
const State_Variables = require('../state-variables.js');    //class State_Variables
const Tram            = require('../tram.js');               //class Tram
const Xarxa           = require('../xarxa.js');              //class Xarxa
                        require('../primary-settler.js');    //tecnologia primary_settler    (dins de State Variables)
                        require('../activated-sludge.js');   //tecnologia activated_sludge   (dins de State Variables)
                        require('../nitrification.js');      //tecnologia nitrification      (dins de State Variables)
                        require('../denitrification.js');    //tecnologia denitrification    (dins de State Variables)

//Nova xarxa buida
let xarxa = new Xarxa();

//Nous trams        ; Connecta'ls      ; Afegeix el tram a la xarxa
let t1 = new Tram() ; /*arrel*/        ; xarxa.trams.push(t1);
let t2 = new Tram() ; /*arrel*/        ; xarxa.trams.push(t2);
let t3 = new Tram() ; /*arrel*/        ; xarxa.trams.push(t3);
let t4 = new Tram() ; /*arrel*/        ; xarxa.trams.push(t4);
let t5 = new Tram() ; t5.pares=[t1,t2] ; xarxa.trams.push(t5);
let t6 = new Tram() ; t6.pares=[t3,t4] ; xarxa.trams.push(t6);
let t7 = new Tram() ; t7.pares=[t5,t6] ; xarxa.trams.push(t7);

//contaminants riu----------------------(Q    VFA FBSO BPO UPO USO iSS FSA OP NOx)
t1.state_variables = new State_Variables(100, 1,  0,   0,  0,  0,  0,  0,  0, 0  );
t2.state_variables = new State_Variables(100, 1,  0,   0,  0,  0,  0,  0,  0, 0  );
t3.state_variables = new State_Variables(100, 0,  0,   0,  0,  0,  0,  0,  0, 0  );
t4.state_variables = new State_Variables(100, 0,  0,   0,  0,  0,  0,  0,  0, 0  );
t5.state_variables = new State_Variables(  0, 0,  0,   0,  0,  0,  0,  0,  0, 0  );
t6.state_variables = new State_Variables(  0, 0,  0,   0,  0,  0,  0,  0,  0, 0  );
t7.state_variables = new State_Variables(  0, 0,  0,   0,  0,  0,  0,  0,  0, 0  );

//Afegeix una EDAR al tram 5
t5.plant = new Plant(
  //syntax-----------(Q,  VFA, FBSO, BPO, UPO, USO, iSS, FSA,  OP,   NOx)
  new State_Variables(25, 50,  115,  440, 100, 45,  60,  39.1, 7.28, 0),
  {pst:true, nit:true, dn:true, cpr:true},
  {//plant parameters
    fw          : 0.00500,   //ø     | PST | fraction of Q that goes to wastage
    removal_BPO : 42.3352,   //%     | PST | removal of the component X_BPO
    removal_UPO : 90.0500,   //%     | PST | removal of the component X_UPO
    removal_iSS : 75.1250,   //%     | PST | removal of the component X_iSS
    T           : 16.0000,   //ºC    | AS  | temperature
    Vp          : 8473.30,   //m3    | AS  | reactor volume
    Rs          : 15.0000,   //d     | AS  | solids retention time or sludge age
    RAS         : 1.00000,   //ø     | AS  | SST underflow recycle ratio
    waste_from  : "reactor", //option| AS  | waste_from | options {'reactor','sst'}
    mass_FeCl3  : 3000.00,   //kg/d  | CPR | mass of FeCl3 added for chemical P removal
    DSVI        : 120.000,   //mL/g  | CAP | sludge settleability (mL/gTSS)
    A_ST        : 30000.0,   //m2    | CAP | area sst
    fq          : 2.40000,   //ø     | CAP | peak flow (Qmax/Qavg)
    SF          : 1.25000,   //ø     | NIT | safety factor. design choice. Moves the sludge age
    fxt         : 0.39000,   //ø     | NIT | current unaerated sludge mass fraction
    DO          : 2.00000,   //mgO/L | NIT | DO in the aerobic reactor
    pH          : 7.20000,   //ø     | NIT | pH
    IR          : 5.40000,   //ø     | DN  | internal recirculation ratio
    DO_RAS      : 1.00000,   //mgO/L | DN  | DO in the underflow recycle
    influent_alk: 250.000,   //mg/L  | DN  | influent alkalinity (mg/L CaCO3)
  }
);

//Soluciona xarxa
console.log("=== RESOL XARXA ==="); 
