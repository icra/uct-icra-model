.TL
Ecoadvisor model formulas
.AU
Institut Català de Recerca de l'Aigua (ICRA)
.SH
.ce
Compilation command (bash)
.LP
.ce
.CW
groff -e -t -ms formulas.ms -T pdf -K utf-8

.nr GROWPS 3
.nr PSINCR 1p
.EQ
delim $$
.EN

.bp
.NH
State Variables
.NH 2
Inputs
.EQ (ML/d)
Q
.EN
.EQ (mg/L)
S sub VFA, S sub FBSO, X sub BPO, X sub UPO, S sub USO, X sub iSS, S sub FSA, S sub OP, S sub NOx
.EN

.NH 2
Total chemical oxygen demand (COD = $S sub t$)
.EQ (mg/L)
S sub t = S sub VFA + S sub FBSO + X sub BPO + X sub UPO + S sub USO
.EN
also:
.TS
tab(;) center;
l.
$ S sub t = S sub b + S sub u = S sub s + S sub p = S sub bs + S sub bp + S sub {u p} + S sub us $;
$ S sub b = S sub bs + S sub bp    $;
$ S sub u = S sub us + S sub {u p} $;
$ S sub s = S sub bs + S sub us    $;
$ S sub p = S sub bp + S sub {u p} $;
$ S sub bs = S sub VFA + S sub FBSO $;
$ S sub bp = X sub BPO $;
$ S sub {u p } = X sub UPO $;
$ S sub us = S sub USO $;
.TE

.NH 2
Mass ratios for COD, N, P and C
.LP
.TS
tab(;) center;
cb cb cb cb cb
n  n  n  n  n.
State Variable; COD ($f sub cv$); N ($f sub N$); P ($f sub P$); C ($f sub C$)
$ S sub VFA  $; 1.0667; 0.0000; 0.0000; 0.400
$ S sub FBSO $; 1.4200; 0.0464; 0.0118; 0.471
$ X sub BPO  $; 1.5230; 0.0323; 0.0072; 0.498
$ X sub UPO  $; 1.4810; 0.1000; 0.0250; 0.518
$ S sub USO  $; 1.4930; 0.0366; 0.0000; 0.498
$ OHO        $; 1.4810; 0.1000; 0.0250; 0.518
$ ANO        $; 1.4810; 0.1000; 0.0250; 0.518
$ PAO        $; 1.4810; 0.1000; 0.0250; 0.518
.TE

.NH 2
Total Kjeldahl Nitrogen (TKN = $N sub t$)
.EQ (mg/L)
N sub t = N sub o + S sub FSA
.EN
where:
.TS
tab(;) center;
l.
$N sub o = N sub obs + N sub obp + N sub ous + N sub oup$;
$N sub obs = S sub VFA f sub N sub VFA over f sub cv sub VFA + S sub FBSO f sub N sub FBSO over f sub cv sub FBSO$;
$N sub obp = X sub BPO f sub N sub BPO over f sub cv sub BPO$;
$N sub ous = S sub USO f sub N sub USO over f sub cv sub USO$;
$N sub oup = X sub UPO f sub N sub UPO over f sub cv sub UPO$;
.TE

.NH 2
Total Phosphorus (TP = $P sub t$)
.EQ (mg/L)
P sub t = P sub o + S sub OP
.EN
where:
.TS
tab(;) center;
l.
$P sub o   = P sub obs + P sub obp + P sub ous + P sub oup$;
$P sub obs = S sub VFA f sub P sub VFA over f sub cv sub VFA + S sub FBSO f sub P sub FBSO over f sub cv sub FBSO$;
$P sub obp = X sub BPO f sub P sub BPO over f sub cv sub BPO$;
$P sub ous = S sub USO f sub P sub USO over f sub cv sub USO$;
$P sub oup = X sub UPO f sub P sub UPO over f sub cv sub UPO$;
.TE

.NH 2
Total Organic Carbon (TOC = $C sub t$)
.EQ (mg/L)
C sub t = C sub obs + C sub obp + C sub ous + C sub oup
.EN
where:
.TS
tab(;) center;
l.
$C sub obs = S sub VFA f sub C sub VFA over f sub cv sub VFA + S sub FBSO f sub C sub FBSO over f sub cv sub FBSO$;
$C sub obp = X sub BPO f sub C sub BPO over f sub cv sub BPO$;
$C sub ous = S sub USO f sub C sub USO over f sub cv sub USO$;
$C sub oup = X sub UPO f sub C sub UPO over f sub cv sub UPO$;
.TE

.NH 2
Total suspended solids (TSS = $X sub T$)
.EQ (mg/L)
X sub T = X sub V + X sub iSS
.EN
where:
.TS
tab(;) center;
l.
$ X sub V = X sub BPO over f sub cv sub BPO + X sub UPO over f sub cv sub UPO $;
.TE

.bp
.NH
Activated sludge

.NH 2
Inputs
.EQ
T, V sub p, R sub s, RAS, mass sub FeCl sub 3
.EN

.NH 2
Volatile suspended solids (VSS)
.EQ (gVSS/gCOD)
Y sub H = 0.45
.EN
.EQ (1/d)
b sub H = 0.24
.EN
.EQ (1/d)
b sub {HT} = b sub H (1.029) sup { ( T - 20 ) }
.EN
.EQ (gVSS·d/gCOD)
f sub X sub BH = {Y sub H · R sub s} over {1 + b sub HT · R sub s}
.EN
.EQ (kgVSS)
MX sub BH = FS sub bi · f sub X sub BH
.EN
.EQ (kgVSS)
MX sub EH = f sub H · b sub HT · R sub s · MX sub BH
.EN
.EQ (kgVSS)
MX sub I = FX sub ti · R sub s
.EN
.EQ (kgVSS)
MX sub V  = MX sub BH + MX sub EH + MX sub I
.EN
.EQ (kgVSS/m\*{3\*})
X sub V = MX sub V over V sub p
.EN

.NH 2
Total inert solids (iSS)
.EQ (giSS/gVSS)
f sub iOHO = 0.15
.EN
.EQ (kgiSS)
MX sub IO = FiSS·R sub s + f sub iOHO · MX sub BH + F sub iSS_precipitation · R sub s
.EN

.NH 2
Total suspended solids (TSS)
.EQ (kgTSS)
MX sub T = MX sub V + MX sub IO
.EN
.EQ (kgTSS/m\*{3\*})
X sub T = MX sub T over V sub p
.EN

.NH 2
Nominal hydraulic retention time
.EQ (d)
HRT = V sub p over Q
.EN

.NH 2
Wastage flowrate
.EQ (ML/d)
Q sub w = V sub p over R sub s
.EN

.NH 2
Effluent flowrate
.EQ (ML/d)
Q sub e = Q - Q sub w
.EN

.NH 2
Nitrogen and Phosphorus required for sludge production
.EQ (mg/L)
N sub s = {f sub N sub OHO (MX sub BH + MX sub EH ) + f sub N sub UPO MX sub I } over {R sub s · Q}
.EN
.EQ (mg/L)
P sub s = {f sub P sub OHO (MX sub BH + MX sub EH ) + f sub P sub UPO MX sub I } over {R sub s · Q}
.EN

.NH 2
Effluent Ammonia concentration
.EQ (mg/L)
N sub ae = N sub ti - N sub s - N sub ouse
.EN

.NH 2
Effluent Orthophosphate concentration
.EQ (mg/L)
P sub se = P sub ti - P sub s - P sub ouse - P sub precipitation
.EN

.NH 2
Wastage solids concentration
.EQ (mg/L)
BPO sub was = f sub cv sub BPO (1-f sub H ) X sub BH
.EN
.EQ (mg/L)
UPO sub was = f sub cv sub UPO (f sub H X sub BH + X sub EH + X sub I )
.EN
.EQ (mg/L)
iSS sub was = MX sub IO over V sub p
.EN

.NH 2
Oxygen demand
.EQ (kgO/d)
FO sub c = Y sub H (1 - f sub cv sub OHO ) + f sub cv sub OHO (1 - f sub H )·b sub HT · f sub X sub BH
.EN
.EQ (kgO/d)
FO sub n = 4.57·Q·N sub ae
.EN
.EQ (kgO/d)
FO sub t = FO sub c + FO sub n
.EN
.EQ (mgO/L·h)
OUR = FO sub t over V sub p
.EN

.bp

.NH
Nitrification

.NH 2
Inputs
.EQ
SF, f sub xt, DO, pH
.EN

.NH 2
Nitrifier kinetics
.EQ (1/d)
µ sub Am = 0.45
.EN
.EQ (1/d)
µ sub AmT = µ sub Am (1.123) sup {T-20}
.EN
.EQ (mgO/L)
K sub O = 0.3
.EN
.EQ (1/d)
µ sub AmO = µ sub AmT {DO  over {K sub O + DO }}
.EN
.EQ
K sub i = 1.13, K sub ii  = 0.3, K sub max = 9.5
.EN
.EQ (1/d)
µ sub AmpH = µ sub AmO (2.35) sup { pH-7.2 } K sub i {{K sub max - pH } over {K sub max + K sub ii - pH }}
.EN
.EQ (gVSS/gNH4)
Y sub A = 0.1
.EN
.EQ (gVSS/gNH4)
Y sub AT  = Y sub A sup { T-20 }
.EN
.EQ (mg/L)
K sub n = 1.0
.EN
.EQ (mg/L)
K sub nT = K sub n (1.123) sup { T-20 }
.EN
.EQ (1/d)
b sub A = 0.04
.EN
.EQ (1/d)
b sub AT  = b sub A (1.029) sup {T-20}
.EN

.NH 2
Maximum design unaerated sludge mass fraction
.EQ (ø)
f sub xm = 1 - SF { b sub AT + 1 over R sub s } over µ sub AmpH
.EN

.NH 2
Minimum sludge age for nitrification
.EQ (d)
R sub sm = 1 over {µ sub AmpH ( 1-f sub xt ) - b sub AT }
.EN

.NH 2
Effluent Ammonia concentration
.EQ (mg/L)
N sub ae = {K sub nT (b sub AT + 1 over R sub s )} over {µ sub AmpH (1-f sub xt ) - b sub AT - 1 over R sub s }
.EN

.NH 2
Nitrification capacity
.EQ (mg/L)
N sub c = N sub ti - N sub s - (N sub ae + N sub ouse)
.EN

.NH 2 
ANO biomass
.EQ (gVSS·d/gNH4)
f sub X sub BA = {Y sub AT R sub s } over {1 + b sub AT · R sub s}
.EN
.EQ (kgVSS)
MX sub BA = Q · N sub c · f sub X sub BA
.EN
.EQ (kgVSS/m\*{3\*})
X sub BA = MX sub BA over V sub p
.EN

.bp

.NH
Denitrification

.NH 2
Inputs
.EQ
  IR, DO sub RAS, alk sub i
.EN

.NH 2
Denitrification kinetics
.EQ (mgN/mgVSS·d)
K sub 1 sup 20 = 0.72,
K sub 2 sup 20 = 0.10,
K sub 3 sup 20 = 0.10,
K sub 4 sup 20 = 0.00
.EN

.EQ (mgN/mgVSS·d)
K sub 1T = K sub 1 sup 20 (1.200) sup {T-20}
.EN
.EQ (mgN/mgVSS·d)
K sub 2T = K sub 2 sup 20 (1.080) sup {T-20}
.EN
.EQ (mgN/mgVSS·d)
K sub 3T = K sub 3 sup 20 (1.029) sup {T-20}
.EN
.EQ (mgN/mgVSS·d)
K sub 4T = K sub 4 sup 20 (1.029) sup {T-20}
.EN

.NH 2
Denitrification potential

.EQ (mgN/L)
D sub p1RBSO = {S sub bsi (1 - f sub cv Y sub H )} over 2.86
.EN

.EQ (mgN/L)
D sub p1BPO  = K sub 2T f sub xt S sub bi f sub X sub BH
.EN

.EQ (mgN/L)
D sub p1 = D sub p1RBSO + D sub p1BPO
.EN


.NH 2
Optimum internal recirculation
.EQ (ø)
  a sub opt = {-B + sqrt { B sup 2 + 4AC }} over 2A
.EN
where:

.TS
tab(;) center;
l.
$ A = DO over 2.86 $
$ B = N sub c - D sub p1 +{ (1+RAS)·DO + RAS·DO sub RAS } over 2.86 $
$ C = (1+RAS) · (D sub p1 - {RAS·DO sub RAS} over 2.86 )-RAS·N sub c $
.TE

.NH 2
Minimum effluent NOx concentration
.EQ (mgN/L)
N sub ne_opt = Nc over {a sub opt + RAS + 1}
.EN

.NH 2
Effluent nitrate
.EQ L
if(a < a sub opt ) 
.EN
.EQ (mgN/L)
N sub ne = N sub c over {a+RAS+1}
.EN
.EQ L
if(a > a sub opt ) 
.EN
.EQ (mgN/L)
  N sub ne = N sub c - D sub p1 + { a*DO + RAS*DO sub RAS } over 2.86
.EN

.NH 2
Nitrogen gas
.EQ (kgN/d)
  FN sub 2 = Q(N sub c - N sub ne )
.EN

.NH 2
Oxygen recovered by denitrification
.EQ (kgO/d)
FO sub d = 2.86 · Q · (N sub c -N sub ne )
.EN
.EQ (kgO/d)
FO sub t = FO sub c + FO sub n - FO sub d
.EN

.NH 2
Effluent alkalinity
.EQ (mg/L)
alk sub e = alk sub i + 3.57·(N sub obi - (N sub s - N sub oupi )) - 7.14·N sub c + 2.86·(N sub c -N sub ne )
.EN
