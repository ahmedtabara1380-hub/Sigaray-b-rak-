import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity, ScrollView,
  TextInput, StatusBar, Platform, Alert, Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';

const PRICE_HISTORY = [
  { date: '2018-01-01', price: 11,  label: 'Ocak 2018 – Piyasaya çıkış' },
  { date: '2019-05-03', price: 12,  label: 'Mayıs 2019 – JTI zammı' },
  { date: '2020-09-04', price: 15,  label: 'Eylül 2020 – ÖTV zammı' },
  { date: '2021-10-05', price: 16,  label: 'Ekim 2021 – JTI +1 TL' },
  { date: '2022-01-03', price: 15,  label: 'Ocak 2022 – Fiyat revizyonu' },
  { date: '2022-07-02', price: 17,  label: 'Temmuz 2022 – JTI +2 TL' },
  { date: '2022-10-15', price: 20,  label: 'Ekim 2022 – ÖTV zammı' },
  { date: '2023-01-01', price: 27,  label: 'Ocak 2023 – Yılbaşı zammı' },
  { date: '2023-06-06', price: 38,  label: 'Haziran 2023 – +5 TL zam' },
  { date: '2023-07-03', price: 43,  label: 'Temmuz 2023 – ÖTV zammı' },
  { date: '2024-01-01', price: 54,  label: 'Ocak 2024 – Yılbaşı zammı' },
  { date: '2024-03-15', price: 65,  label: 'Mart 2024 – ÖTV zammı' },
  { date: '2024-09-06', price: 71,  label: 'Eylül 2024 – JTI zammı' },
  { date: '2025-01-01', price: 71,  label: 'Ocak 2025 – Sabit kaldı' },
  { date: '2025-04-03', price: 62,  label: 'Nisan 2025 – Fiyat revizyonu' },
  { date: '2025-05-27', price: 80,  label: 'Mayıs 2025 – JTI maliyet zammı' },
  { date: '2025-07-04', price: 85,  label: 'Temmuz 2025 – ÖTV +5 TL' },
  { date: '2025-10-17', price: 95,  label: 'Ekim 2025 – Tüm gruplar zamlı' },
  { date: '2026-02-17', price: 105, label: 'Şubat 2026 – JTI zammı' },
];

const CIGS_PER_PACK = 20;
const LIFE_PER_CIG_MIN = 11;
const STORAGE_KEY = 'sigara_v3';
const REWARDS_KEY = 'sigara_rewards_v3';
const RED = '#e05060';
const GOLD = '#f0c060';
const BG = '#080c14';
const CARD_BG = '#0f1a2a';
const BORDER = 'rgba(255,255,255,0.08)';

function getPriceAtDate(dateObj) {
  let price = PRICE_HISTORY[0].price;
  for (const e of PRICE_HISTORY) {
    if (new Date(e.date) <= dateObj) price = e.price;
    else break;
  }
  return price;
}

function calcDailyData(quitDateStr, cigsPerDay) {
  const quit = new Date(quitDateStr);
  quit.setHours(0, 0, 0, 0);
  const now = new Date();
  const result = [];
  let cumulative = 0;
  let cursor = new Date(quit);
  while (cursor <= now) {
    const price = getPriceAtDate(new Date(cursor));
    const saved = (price / CIGS_PER_PACK) * cigsPerDay;
    cumulative += saved;
    result.push({
      date: cursor.toISOString().split('T')[0],
      saved: parseFloat(saved.toFixed(2)),
      cumulative: parseFloat(cumulative.toFixed(2)),
      price,
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  return result;
}

function fmtNum(n, dec = 2) {
  return n.toLocaleString('tr-TR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function fmtDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatLifeGained(cigs) {
  const totalMin = cigs * LIFE_PER_CIG_MIN;
  const days = Math.floor(totalMin / (60 * 24));
  const hours = Math.floor((totalMin % (60 * 24)) / 60);
  const months = Math.floor(days / 30);
  const remDays = days % 30;
  if (months > 0) return `${months}Ay ${remDays}G ${hours}S`;
  return `${days}G ${hours}S`;
}

function futureProjection(cigsPerDay, currentPrice) {
  const periods = [
    { label: '1 Hafta', days: 7 },
    { label: '1 Ay', days: 30 },
    { label: '1 Yıl', days: 365 },
    { label: '5 Yıl', days: 1825 },
    { label: '10 Yıl', days: 3650 },
    { label: '20 Yıl', days: 7300 },
  ];
  return periods.map(({ label, days }) => {
    const money = (currentPrice / CIGS_PER_PACK) * cigsPerDay * days;
    const lifeMin = cigsPerDay * days * LIFE_PER_CIG_MIN;
    const lifeDays = Math.floor(lifeMin / (60 * 24));
    const lifeMonths = Math.floor(lifeDays / 30);
    const lifeYears = Math.floor(lifeMonths / 12);
    const remMonths = lifeMonths % 12;
    const remDays2 = lifeDays % 30;
    let lifeStr = lifeYears > 0 ? `${lifeYears}Y ${remMonths}A` : lifeMonths > 0 ? `${lifeMonths}A ${remDays2}G` : `${lifeDays}G`;
    return { label, money, lifeStr };
  });
}

function CircularProgress({ pct, label, days }) {
  const R = 66, CX = 80, CY = 80;
  const circ = 2 * Math.PI * R;
  const offset = circ * (1 - pct / 100);
  return (
    <View style={{ alignItems: 'center', marginBottom: 8 }}>
      <Svg width={160} height={160} viewBox="0 0 160 160">
        <Circle cx={CX} cy={CY} r={R} fill="none" stroke="#e0e0e0" strokeWidth={12} />
        <Circle cx={CX} cy={CY} r={R} fill="none" stroke={RED} strokeWidth={12}
          strokeDasharray={String(circ)}
          strokeDashoffset={String(offset)}
          strokeLinecap="round"
          rotation="-90"
          originX={CX}
          originY={CY}
        />
        <SvgText x="80" y="72" textAnchor="middle" fill={RED} fontSize="24" fontWeight="bold">
          {fmtNum(pct, 1)}%
        </SvgText>
        <SvgText x="80" y="96" textAnchor="middle" fill="#999" fontSize="12">
          {label}
        </SvgText>
      </Svg>
      <Text style={{ color: '#222', fontWeight: '700', fontSize: 15, marginTop: 4 }}>
        Gün {days} — Her Gün Kazanıyorum!
      </Text>
    </View>
  );
}

function SetupScreen({ onDone }) {
  const [quitDate, setQuitDate] = useState('');
  const [cigsPerDay, setCigsPerDay] = useState(20);
  const [yearsSmoked, setYearsSmoked] = useState(7);
  const [cigsPerPack, setCigsPerPack] = useState(20);
  const [dateText, setDateText] = useState('');

  const handleDateInput = (text) => {
    // Otomatik tire ekle: 2024 → 2024- → 2024-03 → 2024-03-
    let v = text.replace(/[^0-9]/g, '');
    if (v.length > 4) v = v.slice(0,4) + '-' + v.slice(4);
    if (v.length > 7) v = v.slice(0,7) + '-' + v.slice(7);
    v = v.slice(0, 10);
    setDateText(v);
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
      const d = new Date(v);
      if (!isNaN(d.getTime()) && d <= new Date()) setQuitDate(v);
      else setQuitDate('');
    } else {
      setQuitDate('');
    }
  };

  const Stepper = ({ label, val, set, min, max }) => (
    <View style={styles.stepperRow}>
      <Text style={styles.stepperLabel}>{label}{'\n'}<Text style={{ color: GOLD, fontSize: 16, fontWeight: '700' }}>{val}</Text></Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <TouchableOpacity onPress={() => set(Math.max(min, val - 1))} style={styles.stepBtn}>
          <Text style={styles.stepBtnText}>−</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => set(Math.min(max, val + 1))} style={styles.stepBtn}>
          <Text style={styles.stepBtnText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: BG }} contentContainerStyle={{ padding: 22, paddingBottom: 48 }}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />
      <View style={{ alignItems: 'center', marginBottom: 28, marginTop: 44 }}>
        <Text style={{ fontSize: 50 }}>🚭</Text>
        <Text style={{ color: '#fff', fontSize: 24, fontWeight: '700', marginTop: 8 }}>Sigara Bırakma</Text>
        <Text style={{ color: '#555', fontSize: 13, marginTop: 6, textAlign: 'center' }}>Winston Dark Blue gerçek zam geçmişiyle</Text>
      </View>

      <Text style={styles.inputLabel}>SİGARAYI BIRAKTIĞIN TARİH</Text>
      <TextInput
        style={styles.dateInput}
        placeholder="YYYY-AA-GG  (örn: 2024-03-10)"
        placeholderTextColor="#444"
        value={dateText}
        onChangeText={handleDateInput}
        keyboardType="numeric"
        maxLength={10}
      />
      {quitDate
        ? <Text style={{ color: '#70c870', fontSize: 12, marginTop: 4, marginBottom: 14 }}>✓ {fmtDate(quitDate)}</Text>
        : <Text style={{ color: '#555', fontSize: 11, marginTop: 4, marginBottom: 14 }}>Rakamları yaz, tireler otomatik eklenir</Text>
      }

      <View style={{ backgroundColor: CARD_BG, borderWidth: 1, borderColor: BORDER, borderRadius: 18, padding: 4, marginBottom: 14 }}>
        <Stepper label="Günlük içilen sigara" val={cigsPerDay} set={setCigsPerDay} min={1} max={60} />
        <Stepper label="Paketteki sigara sayısı" val={cigsPerPack} set={setCigsPerPack} min={10} max={25} />
        <Stepper label="Kaç yıl içtin" val={yearsSmoked} set={setYearsSmoked} min={1} max={50} />
      </View>

      <View style={{ backgroundColor: 'rgba(240,192,96,0.08)', borderWidth: 1, borderColor: 'rgba(240,192,96,0.2)', borderRadius: 14, padding: 16, marginBottom: 20 }}>
        <Text style={{ color: '#777', fontSize: 11 }}>GÜNCEL WİNSTON DARK BLUE</Text>
        <Text style={{ color: GOLD, fontSize: 24, fontWeight: '700' }}>{getPriceAtDate(new Date())} TL</Text>
      </View>

      <TouchableOpacity
        style={[styles.startBtn, !quitDate && { opacity: 0.4 }]}
        onPress={() => quitDate && onDone({ quitDate, cigsPerDay, yearsSmoked, cigsPerPack })}
        disabled={!quitDate}
      >
        <Text style={styles.startBtnText}>Kazancımı Hesapla →</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function ProfileScreen({ profile, onSave, onReset }) {
  const [cigsPerDay, setCigsPerDay] = useState(profile.cigsPerDay);
  const [yearsSmoked, setYearsSmoked] = useState(profile.yearsSmoked);
  const [cigsPerPack, setCigsPerPack] = useState(profile.cigsPerPack);

  const Stepper = ({ label, val, set, min, max }) => (
    <View style={[styles.stepperRow, { backgroundColor: CARD_BG, borderRadius: 14, paddingHorizontal: 16, marginBottom: 10 }]}>
      <Text style={styles.stepperLabel}>{label}{'\n'}<Text style={{ color: GOLD, fontSize: 18, fontWeight: '700' }}>{val}</Text></Text>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <TouchableOpacity onPress={() => set(Math.max(min, val - 1))} style={styles.stepBtn}><Text style={styles.stepBtnText}>−</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => set(Math.min(max, val + 1))} style={styles.stepBtn}><Text style={styles.stepBtnText}>+</Text></TouchableOpacity>
      </View>
    </View>
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: BG }} contentContainerStyle={{ paddingBottom: 48 }}>
      <View style={[styles.topBar, { backgroundColor: RED }]}>
        <Text style={styles.topBarTitle}>Profil</Text>
      </View>
      <View style={{ padding: 20 }}>
        <Stepper label="Günlük sigara" val={cigsPerDay} set={setCigsPerDay} min={1} max={60} />
        <Stepper label="Paketteki sigara" val={cigsPerPack} set={setCigsPerPack} min={10} max={25} />
        <Stepper label="İçilen yıl" val={yearsSmoked} set={setYearsSmoked} min={1} max={50} />
        <View style={{ backgroundColor: 'rgba(240,192,96,0.08)', borderRadius: 14, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(240,192,96,0.2)' }}>
          <Text style={{ color: '#666', fontSize: 11 }}>GÜNCEL FİYAT (Otomatik)</Text>
          <Text style={{ color: GOLD, fontSize: 22, fontWeight: '700' }}>{getPriceAtDate(new Date())} TL</Text>
          <Text style={{ color: '#444', fontSize: 11 }}>Winston Dark Blue</Text>
        </View>
        <TouchableOpacity style={styles.startBtn} onPress={() => onSave({ cigsPerDay, yearsSmoked, cigsPerPack })}>
          <Text style={styles.startBtnText}>✓ Kaydet</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.startBtn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: RED, marginTop: 12 }]}
          onPress={() => Alert.alert('Sıfırla', 'Tüm verileri silmek istiyor musun?', [
            { text: 'İptal', style: 'cancel' },
            { text: 'Sıfırla', style: 'destructive', onPress: onReset },
          ])}
        >
          <Text style={{ color: RED, fontWeight: '700', fontSize: 15 }}>Sıfırla / Yeni Başlat</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

export default function App() {
  const [screen, setScreen] = useState('loading');
  const [activeTab, setActiveTab] = useState('ilerleme');
  const [profile, setProfile] = useState(null);
  const [dayData, setDayData] = useState([]);
  const [rewards, setRewards] = useState([
    { id: 1, name: 'Sinema Bileti', price: 250 },
    { id: 2, name: 'Ayakkabı', price: 2000 },
  ]);
  const [showAddReward, setShowAddReward] = useState(false);
  const [newRewardName, setNewRewardName] = useState('');
  const [newRewardPrice, setNewRewardPrice] = useState('');
  const [tick, setTick] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) { setProfile(JSON.parse(raw)); setScreen('main'); }
        else setScreen('setup');
        const rr = await AsyncStorage.getItem(REWARDS_KEY);
        if (rr) setRewards(JSON.parse(rr));
      } catch { setScreen('setup'); }
    })();
  }, []);

  useEffect(() => {
    const t = setInterval(() => setTick(x => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (profile) setDayData(calcDailyData(profile.quitDate, profile.cigsPerDay));
  }, [profile, tick]);

  const handleSetup = async (data) => {
    try { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
    setProfile(data); setScreen('main');
  };

  const handleProfileSave = async (updates) => {
    const updated = { ...profile, ...updates };
    try { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch {}
    setProfile(updated); setScreen('main');
  };

  const handleReset = async () => {
    try { await AsyncStorage.removeItem(STORAGE_KEY); } catch {}
    setProfile(null); setDayData([]); setScreen('setup');
  };

  const saveRewards = async (r) => {
    setRewards(r);
    try { await AsyncStorage.setItem(REWARDS_KEY, JSON.stringify(r)); } catch {}
  };

  if (screen === 'loading') return <View style={{ flex: 1, backgroundColor: BG }} />;
  if (screen === 'setup') return <SetupScreen onDone={handleSetup} />;
  if (screen === 'profile') return <ProfileScreen profile={profile} onSave={handleProfileSave} onReset={handleReset} />;

  const now = new Date();
  const quitMs = now - new Date(profile.quitDate);
  const daysQuit = Math.floor(quitMs / 86400000);
  const hoursQuit = Math.floor((quitMs % 86400000) / 3600000);
  const minsQuit = Math.floor((quitMs % 3600000) / 60000);
  const secsQuit = Math.floor((quitMs % 60000) / 1000);
  const cigsNotSmoked = daysQuit * profile.cigsPerDay;
  const totalSaved = dayData.length > 0 ? dayData[dayData.length - 1].cumulative : 0;
  const currentPrice = dayData.length > 0 ? dayData[dayData.length - 1].price : getPriceAtDate(now);
  const last7 = dayData.slice(-7).reduce((s, d) => s + d.saved, 0);
  const last30 = dayData.slice(-30).reduce((s, d) => s + d.saved, 0);
  const milestoneTarget = daysQuit < 7 ? 7 : daysQuit < 30 ? 30 : daysQuit < 365 ? 365 : 3650;
  const milestonePct = Math.min((daysQuit / milestoneTarget) * 100, 100);
  const milestoneLabel = daysQuit < 7 ? `${7 - daysQuit} gün kaldı` : daysQuit < 30 ? '1 HAFTA ✓' : daysQuit < 365 ? '1 AY ✓' : '1 YIL ✓';
  const totalYears = profile.yearsSmoked || 7;
  const totalCigsSmoked = totalYears * 365 * profile.cigsPerDay;
  const totalSpent = (() => {
    let t = 0;
    for (let y = 0; y < totalYears; y++) {
      const yr = now.getFullYear() - totalYears + y;
      for (let d = 0; d < 365; d++) {
        t += (getPriceAtDate(new Date(yr, 0, d + 1)) / CIGS_PER_PACK) * profile.cigsPerDay;
      }
    }
    return t;
  })();
  const lifeLostMin = totalCigsSmoked * LIFE_PER_CIG_MIN;
  const lifeLost = `${Math.floor(lifeLostMin / (60*24*365))}Y ${Math.floor((lifeLostMin%(60*24*365))/(60*24*30))}A`;
  const projections = futureProjection(profile.cigsPerDay, currentPrice);

  const TABS = [
    { id: 'ilerleme', icon: '📊', label: 'İlerleme' },
    { id: 'oduller', icon: '🎁', label: 'Ödüller' },
    { id: 'gunluk', icon: '📅', label: 'Günlük' },
    { id: 'fiyatlar', icon: '💰', label: 'Fiyatlar' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar barStyle="light-content" backgroundColor={RED} />
      <View style={[styles.topBar, { backgroundColor: RED }]}>
        <Text style={styles.topBarTitle}>
          {activeTab === 'ilerleme' ? 'İlerleme' : activeTab === 'oduller' ? 'Ödüller' : activeTab === 'gunluk' ? 'Günlük' : 'Fiyat Tarihi'}
        </Text>
        <TouchableOpacity onPress={() => setScreen('profile')} style={styles.profileBtn}>
          <Text style={{ color: '#fff', fontSize: 13 }}>Profil</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 80 }}>

        {activeTab === 'ilerleme' && (
          <View style={{ padding: 14 }}>
            <View style={styles.whiteCard}>
              <CircularProgress pct={milestonePct} label={milestoneLabel} days={daysQuit} />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 1, backgroundColor: '#e8e8e8', borderRadius: 12, overflow: 'hidden', marginTop: 12 }}>
                {[
                  { icon: '🚩', val: `${daysQuit}g ${hoursQuit}s ${minsQuit}d ${secsQuit}sn`, label: 'Sigarasız', color: RED },
                  { icon: '💵', val: `${fmtNum(totalSaved)} ₺`, label: 'Kazanılan Para', color: RED },
                  { icon: '⏰', val: formatLifeGained(cigsNotSmoked), label: 'Kazanılan Hayat', color: '#2ecc71' },
                  { icon: '🚬', val: cigsNotSmoked.toLocaleString('tr-TR'), label: 'İçilmeyen Sigara', color: '#4a90e2' },
                ].map((s, i) => (
                  <View key={i} style={{ width: '49.5%', backgroundColor: '#fff', padding: 14, alignItems: 'center' }}>
                    <Text style={{ fontSize: 22, marginBottom: 4 }}>{s.icon}</Text>
                    <Text style={{ color: s.color, fontWeight: '700', fontSize: 12, textAlign: 'center' }}>{s.val}</Text>
                    <Text style={{ color: '#999', fontSize: 10, marginTop: 2, textAlign: 'center' }}>{s.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.whiteCard}>
              <Text style={styles.cardTitle}>Sigara içtiğiniz dönemde:</Text>
              {[
                { icon: '🚬', val: totalCigsSmoked.toLocaleString('tr-TR'), label: 'Sigara İçildi' },
                { icon: '💀', val: `${fmtNum(totalSpent, 0)} ₺`, label: 'Para Harcandı' },
                { icon: '⏱️', val: lifeLost, label: 'Hayat Kaybedildi' },
              ].map((s, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, borderBottomWidth: i < 2 ? 1 : 0, borderBottomColor: '#f5f5f5' }}>
                  <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#333', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 20 }}>{s.icon}</Text>
                  </View>
                  <View>
                    <Text style={{ color: RED, fontWeight: '700', fontSize: 16 }}>{s.val}</Text>
                    <Text style={{ color: '#999', fontSize: 12 }}>{s.label}</Text>
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.whiteCard}>
              <Text style={styles.cardTitle}>Ne kadar kar elde edeceksiniz?</Text>
              <Text style={{ color: '#aaa', fontSize: 12, marginBottom: 12 }}>Para ve Hayat Beklentisi</Text>
              {projections.map((p, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 6, backgroundColor: i % 2 === 0 ? '#f9f9f9' : '#fff', borderRadius: 8 }}>
                  <Text style={{ color: '#555', fontSize: 13, flex: 1
