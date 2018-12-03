//resultats fraccionament lluís c.
Q      = 0.40896774;
S_VFA  = 30.1;
S_FBSO = 170.4;
X_BPO  = 191;
X_UPO  = 211.8;
S_USO  = 9.8;
X_iSS  = 30.2;
S_FSA  = 36.7;
S_OP   = 4.9;
S_NOx  = 1;

//inputs edar peralada
T             =  19;
Vp            =  829;
Rs            =  35.9;
RAS           =  1;
waste_from    =  "sst";
SF            =  1.25;
fxt           =  fxm;
DO            =  1;
pH            =  7.2;
IR            =  40; //no  aplicable  pq  tenim  carrousel,  no  anoxic
DO_RAS        =  1.0;
influent_alk  =  250;
mass_FeCl3    =  20;

let url_recomanador='http://localhost/ecoadvisor/tests/recomanador.html?influent=[0.40896774,30.1,170.4,191,211.8,9.8,30.2,36.7,4.9,0]&tram=[25.880,62.274,18.45841,0.0010055,0.0358,2000,0.6,15]&conf={"pst":false,"nit":true,"dn":true,"cpr":true}&inputs={"fw":0.005,"removal_BPO":42.3352,"removal_UPO":90.0500,"removal_iSS":75.1250,"T":19,"Vp":829,"Rs":35.9,"RAS":1.0,"waste_from":"sst","mass_FeCl3":20,"SF":1.25,"fxt":0.39,"DO":1,"pH":7.2,"IR":5.4,"DO_RAS":1.0,"influent_alk":250}&deg={"R_20":{"NH4":0.0000005,"PO4":0.0000005},"k":{"NH4":1,"PO4":1}}'
