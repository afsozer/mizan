import type { ComponentChildren } from 'preact';
import { useEffect, useMemo, useState } from 'preact/hooks';
import { parse, stringify } from 'yaml';
import {
  ICRA_FAIZ_TURU_ADLARI,
  ICRA_TAKIP_TURU_ADLARI,
  TAHSIL_ASAMA_ADLARI,
  icraDefterSatiri,
  icraGirdiCoz,
  icraHesapla,
  icraKanitDosyaAdi,
  tl,
  trTarih,
  yuzde,
  type IcraFaizTuru,
  type IcraHesapSonucu,
  type IcraTakipTuru,
  type TahsilHarciAsamasi,
} from '../../src/index.ts';
import ornekIcraYaml from '../../ornekler/ornek-icra.yaml?raw';
import { KaynakBilgisi, VeriTablosu } from './Results.tsx';
import { icraPdfIndir, indir, surum, uretimTarihi } from './exports.ts';
import { hataAciklamasi } from './form-model.ts';
import { hesapTablolari, type TabloBelgesi } from './tables.ts';

interface KalemFormSatiri {
  ad: string;
  tutar: string;
  aciklama: string;
}

interface MasrafFormSatiri {
  tarih: string;
  tutar: string;
  aciklama: string;
}

interface KismiOdemeFormSatiri {
  tarih: string;
  tutar: string;
  aciklama: string;
}

export interface IcraFormModeli {
  dosya: {
    mahkeme: string;
    esasNo: string;
    kaynak: string;
    altAlan: string;
    kisaAd: string;
    hazirlayan: string;
  };
  hesapTarihi: string;
  faizGunEsasi: string;
  takip: {
    takipTarihi: string;
    takipTuru: IcraTakipTuru;
    asilAlacak: string;
    takipOncesiKalemler: KalemFormSatiri[];
    faiz: {
      tur: IcraFaizTuru;
      sozlesmeOrani: string;
      gerekce: string;
    };
    pesinHarcAlindiMi: boolean;
    tahsilHarciAsamasi: TahsilHarciAsamasi;
    feragatVarMi: boolean;
    vekaletUcreti: string;
    masraflar: MasrafFormSatiri[];
    kismiOdemeler: KismiOdemeFormSatiri[];
  };
}

export function bosIcraFormu(): IcraFormModeli {
  return {
    dosya: {
      mahkeme: '',
      esasNo: '',
      kaynak: 'örnek hesap',
      altAlan: '60.05',
      kisaAd: '',
      hazirlayan: '',
    },
    hesapTarihi: '',
    faizGunEsasi: '365',
    takip: {
      takipTarihi: '',
      takipTuru: 'ilamsiz',
      asilAlacak: '',
      takipOncesiKalemler: [],
      faiz: {
        tur: 'avans',
        sozlesmeOrani: '',
        gerekce: '',
      },
      pesinHarcAlindiMi: true,
      tahsilHarciAsamasi: 'satistan-once',
      feragatVarMi: false,
      vekaletUcreti: '0',
      masraflar: [],
      kismiOdemeler: [],
    },
  };
}

function sayiYadaMetin(deger: string): number | string {
  const temiz = deger.trim();
  if (/^-?\d+(\.\d+)?$/.test(temiz)) return Number(temiz);
  return temiz;
}

export function icraFormdanHamGirdi(f: IcraFormModeli): Record<string, unknown> {
  const dosya: Record<string, unknown> = {
    mahkeme: f.dosya.mahkeme,
    esasNo: f.dosya.esasNo,
    kaynak: f.dosya.kaynak,
    altAlan: f.dosya.altAlan,
  };
  if (f.dosya.kisaAd.trim()) dosya.kisaAd = f.dosya.kisaAd.trim();
  if (f.dosya.hazirlayan.trim()) dosya.hazirlayan = f.dosya.hazirlayan.trim();

  const faiz: Record<string, unknown> = {
    tur: f.takip.faiz.tur,
    gerekce: f.takip.faiz.gerekce,
  };
  if (f.takip.faiz.tur === 'sozlesme' && f.takip.faiz.sozlesmeOrani.trim()) {
    faiz.sozlesmeOrani = sayiYadaMetin(f.takip.faiz.sozlesmeOrani);
  }

  return {
    alan: 'icra',
    dosya,
    hesapTarihi: f.hesapTarihi,
    parametreler: {
      faizGunEsasi: sayiYadaMetin(f.faizGunEsasi || '365'),
    },
    takip: {
      takipTarihi: f.takip.takipTarihi,
      takipTuru: f.takip.takipTuru,
      asilAlacak: sayiYadaMetin(f.takip.asilAlacak),
      takipOncesiKalemler: f.takip.takipOncesiKalemler.map((k) => ({
        ad: k.ad,
        tutar: sayiYadaMetin(k.tutar),
        ...(k.aciklama.trim() ? { aciklama: k.aciklama.trim() } : {}),
      })),
      faiz,
      pesinHarcAlindiMi: f.takip.pesinHarcAlindiMi,
      tahsilHarciAsamasi: f.takip.tahsilHarciAsamasi,
      feragatVarMi: f.takip.feragatVarMi,
      vekaletUcreti: sayiYadaMetin(f.takip.vekaletUcreti || '0'),
      masraflar: f.takip.masraflar.map((m) => ({
        tarih: m.tarih,
        tutar: sayiYadaMetin(m.tutar),
        aciklama: m.aciklama,
      })),
      kismiOdemeler: f.takip.kismiOdemeler.map((o) => ({
        tarih: o.tarih,
        tutar: sayiYadaMetin(o.tutar),
        aciklama: o.aciklama,
      })),
    },
  };
}

export function icraFormYamli(f: IcraFormModeli): string {
  return stringify(icraFormdanHamGirdi(f));
}

export function yamlIcraForma(metin: string): IcraFormModeli {
  const g = icraGirdiCoz(parse(metin));
  return {
    dosya: {
      mahkeme: g.dosya.mahkeme,
      esasNo: g.dosya.esasNo,
      kaynak: g.dosya.kaynak,
      altAlan: g.dosya.altAlan,
      kisaAd: g.dosya.kisaAd ?? '',
      hazirlayan: g.dosya.hazirlayan ?? '',
    },
    hesapTarihi: g.hesapTarihi,
    faizGunEsasi: (g.parametreler?.faizGunEsasi ?? 365).toString(),
    takip: {
      takipTarihi: g.takip.takipTarihi,
      takipTuru: g.takip.takipTuru,
      asilAlacak: g.takip.asilAlacak.toString(),
      takipOncesiKalemler: g.takip.takipOncesiKalemler.map((k) => ({
        ad: k.ad,
        tutar: k.tutar.toString(),
        aciklama: k.aciklama ?? '',
      })),
      faiz: {
        tur: g.takip.faiz.tur,
        sozlesmeOrani: g.takip.faiz.sozlesmeOrani ? g.takip.faiz.sozlesmeOrani.toString() : '',
        gerekce: g.takip.faiz.gerekce,
      },
      pesinHarcAlindiMi: g.takip.pesinHarcAlindiMi,
      tahsilHarciAsamasi: g.takip.tahsilHarciAsamasi,
      feragatVarMi: g.takip.feragatVarMi,
      vekaletUcreti: g.takip.vekaletUcreti.toString(),
      masraflar: g.takip.masraflar.map((m) => ({
        tarih: m.tarih,
        tutar: m.tutar.toString(),
        aciklama: m.aciklama,
      })),
      kismiOdemeler: g.takip.kismiOdemeler.map((o) => ({
        tarih: o.tarih,
        tutar: o.tutar.toString(),
        aciklama: o.aciklama,
      })),
    },
  };
}

export function IcraSonuclar({ sonuc, tam = false }: { sonuc: IcraHesapSonucu; tam?: boolean }) {
  const h = sonuc.harclar;
  const ozetSatirlari: string[][] = [
    ['Asıl alacak (anapara)', 'Takip çıkışı anapara', tl(sonuc.asilAlacak)],
    ['Takip öncesi fer\'iler', 'TBK m.121/3 (faiz yürütülmez)', tl(sonuc.takipOncesiToplam)],
    ['Takip çıkışı toplamı (harç matrahı)', '492 s.K. m.20', tl(sonuc.takipCikisToplami)],
    ['Başvurma harcı', '492 s.K. (1) sayılı tarife B/I-1', tl(h.basvurmaHarci)],
    ['Peşin harç', h.pesinHarc.isZero() ? 'Alınmadı (ilamlı / muaf)' : `492 s.K. m.29 (${yuzde(h.pesinHarcOrani)})`, tl(h.pesinHarc)],
    [
      'Bakiye tahsil harcı',
      `492 s.K. B/I-3 (${yuzde(h.uygulananTahsilOrani)} tahsil harcından ${tl(h.mahsupEdilenPesinHarc)} TL peşin harç mahsubu)`,
      tl(h.bakiyeTahsilHarci),
    ],
    ['İcra vekalet ücreti', 'AAÜT / İİK m.138', tl(sonuc.vekaletUcreti)],
    ['Takip masrafları toplamı', 'İİK m.59', tl(sonuc.toplamMasraf)],
    ['Takip sonrası işlemiş faiz', ICRA_FAIZ_TURU_ADLARI[sonuc.girdi.takip.faiz.tur], tl(sonuc.toplamTakipSonrasiFaiz)],
    [
      'Kısmi ödemeler toplamı (mahsup)',
      '6098 s.K. TBK m.100',
      sonuc.toplamKismiOdeme.isZero() ? '0,00' : `-${tl(sonuc.toplamKismiOdeme)}`,
    ],
    ['Borçlunun ödeyeceği kapak tutarı', 'Kalan anapara + faiz/gider + bakiye tahsil harcı', tl(sonuc.borclununOdeyecegiKapakTutari)],
    [
      'Cezaevleri yapı harcı (alacaklıdan kesilen)',
      `2548 s.K. m.1 (${yuzde(h.cezaeviHarciOrani)}; borçluya yüklenmez)`,
      `-${tl(h.cezaeviHarci)}`,
    ],
    ['Alacaklıya net ödenecek tutar', 'Tahsil ve cezaevi harçları düşüldükten sonra net reddiyat', tl(sonuc.alacakliyaNetOdenecekTutar)],
  ];

  return (
    <div class="sonuclar">
      <div class="toplam-karti">
        <div>
          <span>Borçlunun ödeyeceği kapak tutarı</span>
          <strong>{tl(sonuc.borclununOdeyecegiKapakTutari)} TL</strong>
        </div>
        <div class="toplam-alt">
          <span>Takip çıkışı: {tl(sonuc.takipCikisToplami)} TL</span>
          <span>Takip sonrası faiz: {tl(sonuc.toplamTakipSonrasiFaiz)} TL</span>
          <span>Alacaklıya net ödenecek tutar: {tl(sonuc.alacakliyaNetOdenecekTutar)} TL</span>
        </div>
      </div>

      {sonuc.uyarilar.map((u, i) => (
        <p class="uyari-kutusu" key={i}>
          {u}
        </p>
      ))}

      <VeriTablosu
        basliklar={['Kalem', 'Dayanak / Açıklama', 'Tutar (TL)']}
        satirlar={ozetSatirlari}
        aciklama="İcra kapak hesabı özeti"
      />

      {sonuc.kismiOdemeAdimlari.length > 0 && (
        <details class="kalem-sonucu" open={tam}>
          <summary>
            <span>TBK m.100 Kısmi Ödeme Mahsubu ({sonuc.kismiOdemeAdimlari.length} ödeme)</span>
            <b>-{tl(sonuc.toplamKismiOdeme)} TL</b>
          </summary>
          <div class="kalem-detay">
            <VeriTablosu
              basliklar={[
                '#',
                'Tarih',
                'Ödeme (TL)',
                'Dönem faizi (TL)',
                'Faiz/giderden düşülen (TL)',
                'Anaparadan düşülen (TL)',
                'Kalan faiz/gider (TL)',
                'Kalan anapara (TL)',
              ]}
              satirlar={sonuc.kismiOdemeAdimlari.map((a) => [
                String(a.sira),
                trTarih(a.tarih),
                tl(a.odemeTutari),
                tl(a.donemFaizi.toplam),
                tl(a.faizVeGiderdenMahsup),
                tl(a.asilAlacaktanMahsup),
                tl(a.kalanFaizVeGider),
                tl(a.kalanAsilAlacak),
              ])}
              aciklama="TBK m.100 kısmi ödeme mahsup adımları"
            />
          </div>
        </details>
      )}

      <details class="kalem-sonucu" open={tam}>
        <summary>
          <span>Takip Sonrası Faiz Kesitleri</span>
          <b>{tl(sonuc.toplamTakipSonrasiFaiz)} TL</b>
        </summary>
        <div class="kalem-detay">
          {sonuc.faizDonemleri.map((fd, i) => (
            <div class="faiz-blogu" key={i}>
              <h4>
                {fd.aciklama} · Matrah {tl(fd.matrah)} TL
              </h4>
              {fd.kesitler.length > 0 ? (
                <VeriTablosu
                  basliklar={['Dönem', 'Gün', 'Yıllık oran', 'Faiz (TL)']}
                  satirlar={fd.kesitler.map((x) => [
                    `${trTarih(x.baslangic)} - ${trTarih(x.bitis)}`,
                    String(x.gun),
                    yuzde(x.oran),
                    tl(x.tutar),
                  ])}
                  toplam={['Dönem toplamı', '', '', tl(fd.toplam)]}
                  aciklama={fd.aciklama}
                />
              ) : (
                <p class="ipucu">Bu dönemde faiz işlemedi.</p>
              )}
            </div>
          ))}
        </div>
      </details>

      {tam && (
        <>
          <section class="rapor-bolumu">
            <h3>Hukuki dayanaklar</h3>
            <ul>
              {sonuc.dayanaklar.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          </section>
          <section class="rapor-bolumu">
            <h3>Kullanılan tablo satırları ve resmi kaynakları</h3>
            {sonuc.kaynaklar.map((k, i) => (
              <div class="kaynak-karti" key={i}>
                <div class="kaynak-ust">
                  <strong>{k.tablo}</strong>
                  <span>
                    {k.aralik} · {k.deger}
                  </span>
                </div>
                <KaynakBilgisi kaynak={k.kaynak} />
              </div>
            ))}
          </section>
        </>
      )}
    </div>
  );
}

const ICRA_BOLUMLER = [
  { ad: 'Dosya ve tarih', aciklama: 'İcra dairesi, dosya numarası, bilirkişilik alt alanı ve kapak hesap tarihi.' },
  { ad: 'Takip çıkışı ve faiz', aciklama: 'Takip tarihi, takip türü, asıl alacak, takip öncesi fer\'iler ve takip sonrası faiz oranı.' },
  { ad: 'Harçlar ve masraflar', aciklama: '492 s.K. peşin harç, tahsil harcı aşaması, feragat durumu, vekalet ücreti ve masraflar.' },
  { ad: 'Kısmi ödemeler (TBK m.100)', aciklama: 'Dosyaya yapılan kısmi ödemeler; önce işlemiş faiz ve giderlerden, artanı anaparadan düşülür.' },
];

export function IcraCalismaAlani({
  alanSecici,
  sayfa,
  sayfaYaz,
  belgeler,
  bildir,
  mesgul,
  mesgulYaz,
  disaridanYaml,
  disaridanYamlTemizle,
  disYamlYukle,
}: {
  alanSecici: ComponentChildren;
  sayfa: string;
  sayfaYaz: (s: string) => void;
  belgeler: TabloBelgesi[];
  bildir: (m: string) => void;
  mesgul: boolean;
  mesgulYaz: (m: boolean) => void;
  disaridanYaml: string;
  disaridanYamlTemizle: () => void;
  disYamlYukle: (f: File) => void;
}) {
  const [form, formStateYaz] = useState<IcraFormModeli>(() => yamlIcraForma(ornekIcraYaml));
  const [adim, adimYaz] = useState(0);
  const [defterMetni, defterYaz] = useState('');

  useEffect(() => {
    if (!disaridanYaml) return;
    try {
      const yeni = yamlIcraForma(disaridanYaml);
      formStateYaz(yeni);
      disaridanYamlTemizle();
    } catch (e) {
      disaridanYamlTemizle();
      bildir(`İcra YAML yüklenemedi: ${e instanceof Error ? e.message : String(e)}`);
    }
  }, [disaridanYaml]);

  const formGuncelle = (yeni: IcraFormModeli) => {
    formStateYaz(yeni);
    bildir('');
    defterYaz('');
  };

  const degerlendirme = useMemo(() => {
    try {
      if (!belgeler.length) return { sonuc: null, hata: null };
      const girdi = icraGirdiCoz(icraFormdanHamGirdi(form));
      const sonuc = icraHesapla(girdi, hesapTablolari(belgeler, undefined));
      return { sonuc, hata: null };
    } catch (e) {
      return { sonuc: null, hata: e instanceof Error ? e.message : String(e) };
    }
  }, [form, belgeler]);

  const { sonuc, hata } = degerlendirme;

  const pdfOlustur = async () => {
    if (!sonuc) return;
    mesgulYaz(true);
    try {
      await icraPdfIndir(sonuc, icraFormYamli(form));
      bildir('İcra kapak hesabı PDF raporu hazırlandı ve indirme başlatıldı.');
    } catch (e) {
      bildir(`PDF oluşturulamadı: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      mesgulYaz(false);
    }
  };

  const defterKopyala = async () => {
    if (!sonuc) return;
    const metin = icraDefterSatiri(sonuc, uretimTarihi(), surum());
    try {
      await navigator.clipboard.writeText(metin);
      bildir('Kayıt defteri satırı panoya kopyalandı.');
    } catch {
      defterYaz(metin);
      bildir('Panoya erişilemedi. Aşağıdaki kayıt defteri satırını seçip kopyalayın.');
    }
  };

  return (
    <>
      <div class="calisma-seridi">
        <div class="calisma-secimler">{alanSecici}</div>
        <div class="araclar">
          <button
            onClick={() => {
              formGuncelle(yamlIcraForma(ornekIcraYaml));
              adimYaz(0);
              sayfaYaz('hesap');
              bildir('Kurgusal örnek icra kapak hesabı yüklendi.');
            }}
          >
            Örnek hesap yükle
          </button>
          <button
            onClick={() => {
              formGuncelle(bosIcraFormu());
              adimYaz(0);
              sayfaYaz('hesap');
              bildir('Form temizlendi.');
            }}
          >
            Formu temizle
          </button>
          <label class="buton dosya-buton">
            YAML yükle
            <input
              type="file"
              accept=".yaml,.yml,application/yaml,text/yaml"
              onChange={(e) => {
                const f = e.currentTarget.files?.[0];
                if (f) disYamlYukle(f);
                e.currentTarget.value = '';
              }}
            />
          </label>
        </div>
      </div>

      {(sayfa === 'hesap' || sayfa === 'ihtimaller') && (
        <div class="hesap-duzeni">
          <section class="form-paneli" aria-label="İcra kapak hesabı girdileri">
            <div class="bolum-basligi">
              <span class="bolum-no">{String(adim + 1).padStart(2, '0')} / 04</span>
              <h1>{ICRA_BOLUMLER[adim]!.ad}</h1>
            </div>
            <nav class="adimlar" aria-label="İcra hesap adımları">
              {ICRA_BOLUMLER.map((b, i) => (
                <button key={b.ad} aria-current={adim === i ? 'step' : undefined} onClick={() => adimYaz(i)}>
                  {b.ad}
                </button>
              ))}
            </nav>

            <form onSubmit={(e) => e.preventDefault()} noValidate>
              {adim === 0 && (
                <div class="alan-izgarasi">
                  <div class="alan">
                    <label for="icra-mahkeme">İcra dairesi / mahkeme *</label>
                    <input
                      id="icra-mahkeme"
                      value={form.dosya.mahkeme}
                      placeholder="Örnek İcra Dairesi"
                      onInput={(e) => formGuncelle({ ...form, dosya: { ...form.dosya, mahkeme: e.currentTarget.value } })}
                    />
                  </div>
                  <div class="alan">
                    <label for="icra-esas">Dosya (esas) no *</label>
                    <input
                      id="icra-esas"
                      value={form.dosya.esasNo}
                      placeholder="2026/1"
                      onInput={(e) => formGuncelle({ ...form, dosya: { ...form.dosya, esasNo: e.currentTarget.value } })}
                    />
                  </div>
                  <div class="alan">
                    <label for="icra-kaynak">Görevlendirme kaynağı *</label>
                    <input
                      id="icra-kaynak"
                      value={form.dosya.kaynak}
                      onInput={(e) => formGuncelle({ ...form, dosya: { ...form.dosya, kaynak: e.currentTarget.value } })}
                    />
                  </div>
                  <div class="alan">
                    <label for="icra-altalan">Bilirkişilik alt alanı *</label>
                    <input
                      id="icra-altalan"
                      value={form.dosya.altAlan}
                      placeholder="60.05"
                      onInput={(e) => formGuncelle({ ...form, dosya: { ...form.dosya, altAlan: e.currentTarget.value } })}
                    />
                  </div>
                  <div class="alan">
                    <label for="icra-hesap-tarihi">Kapak (hesap) tarihi *</label>
                    <input
                      id="icra-hesap-tarihi"
                      type="date"
                      value={form.hesapTarihi}
                      onInput={(e) => formGuncelle({ ...form, hesapTarihi: e.currentTarget.value })}
                    />
                  </div>
                  <div class="alan">
                    <label for="icra-hazirlayan">Hazırlayan</label>
                    <input
                      id="icra-hazirlayan"
                      value={form.dosya.hazirlayan}
                      placeholder="Örnek Bilirkişi"
                      onInput={(e) => formGuncelle({ ...form, dosya: { ...form.dosya, hazirlayan: e.currentTarget.value } })}
                    />
                  </div>
                </div>
              )}

              {adim === 1 && (
                <div class="alan-izgarasi">
                  <div class="alan">
                    <label for="icra-takip-tarihi">Takip tarihi *</label>
                    <input
                      id="icra-takip-tarihi"
                      type="date"
                      value={form.takip.takipTarihi}
                      onInput={(e) =>
                        formGuncelle({ ...form, takip: { ...form.takip, takipTarihi: e.currentTarget.value } })
                      }
                    />
                  </div>
                  <div class="alan">
                    <label for="icra-takip-turu">Takip türü *</label>
                    <select
                      id="icra-takip-turu"
                      value={form.takip.takipTuru}
                      onChange={(e) => {
                        const yeniTur = e.currentTarget.value as IcraTakipTuru;
                        formGuncelle({
                          ...form,
                          takip: {
                            ...form.takip,
                            takipTuru: yeniTur,
                            pesinHarcAlindiMi: yeniTur === 'ilamli' ? false : form.takip.pesinHarcAlindiMi,
                          },
                        });
                      }}
                    >
                      {(Object.keys(ICRA_TAKIP_TURU_ADLARI) as IcraTakipTuru[]).map((k) => (
                        <option key={k} value={k}>
                          {ICRA_TAKIP_TURU_ADLARI[k]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div class="alan">
                    <label for="icra-asil-alacak">Asıl alacak (TL) *</label>
                    <input
                      id="icra-asil-alacak"
                      type="number"
                      step="0.01"
                      value={form.takip.asilAlacak}
                      onInput={(e) =>
                        formGuncelle({ ...form, takip: { ...form.takip, asilAlacak: e.currentTarget.value } })
                      }
                    />
                  </div>
                  <div class="alan">
                    <label for="icra-faiz-turu">Takip sonrası faiz türü *</label>
                    <select
                      id="icra-faiz-turu"
                      value={form.takip.faiz.tur}
                      onChange={(e) =>
                        formGuncelle({
                          ...form,
                          takip: {
                            ...form.takip,
                            faiz: { ...form.takip.faiz, tur: e.currentTarget.value as IcraFaizTuru },
                          },
                        })
                      }
                    >
                      {(Object.keys(ICRA_FAIZ_TURU_ADLARI) as IcraFaizTuru[]).map((k) => (
                        <option key={k} value={k}>
                          {ICRA_FAIZ_TURU_ADLARI[k]}
                        </option>
                      ))}
                    </select>
                  </div>
                  {form.takip.faiz.tur === 'sozlesme' && (
                    <div class="alan">
                      <label for="icra-sozlesme-orani">Yıllık sözleşme faiz oranı (0-1) *</label>
                      <input
                        id="icra-sozlesme-orani"
                        type="number"
                        step="0.0001"
                        placeholder="0.45"
                        value={form.takip.faiz.sozlesmeOrani}
                        onInput={(e) =>
                          formGuncelle({
                            ...form,
                            takip: {
                              ...form.takip,
                              faiz: { ...form.takip.faiz, sozlesmeOrani: e.currentTarget.value },
                            },
                          })
                        }
                      />
                    </div>
                  )}
                  <div class="alan genis">
                    <label for="icra-faiz-gerekce">Faiz gerekçesi *</label>
                    <input
                      id="icra-faiz-gerekce"
                      value={form.takip.faiz.gerekce}
                      placeholder="Ticari fatura alacağı (3095 s.K. m.2/2 avans faizi)"
                      onInput={(e) =>
                        formGuncelle({
                          ...form,
                          takip: {
                            ...form.takip,
                            faiz: { ...form.takip.faiz, gerekce: e.currentTarget.value },
                          },
                        })
                      }
                    />
                  </div>
                  <div class="alan genis">
                    <div class="liste-baslik">
                      <span>Takip öncesi birikmiş faiz ve fer&apos;i kalemler</span>
                      <button
                        type="button"
                        onClick={() =>
                          formGuncelle({
                            ...form,
                            takip: {
                              ...form.takip,
                              takipOncesiKalemler: [
                                ...form.takip.takipOncesiKalemler,
                                { ad: 'İşlemiş faiz', tutar: '0', aciklama: '' },
                              ],
                            },
                          })
                        }
                      >
                        + Kalem ekle
                      </button>
                    </div>
                    {form.takip.takipOncesiKalemler.map((k, idx) => (
                      <div class="satir-karti" key={idx}>
                        <div class="alan-izgarasi">
                          <div class="alan">
                            <label for={`icra-oncesi-ad-${idx}`}>Kalem adı *</label>
                            <input
                              id={`icra-oncesi-ad-${idx}`}
                              value={k.ad}
                              onInput={(e) => {
                                const liste = [...form.takip.takipOncesiKalemler];
                                liste[idx] = { ...k, ad: e.currentTarget.value };
                                formGuncelle({ ...form, takip: { ...form.takip, takipOncesiKalemler: liste } });
                              }}
                            />
                          </div>
                          <div class="alan">
                            <label for={`icra-oncesi-tutar-${idx}`}>Tutar (TL) *</label>
                            <input
                              id={`icra-oncesi-tutar-${idx}`}
                              type="number"
                              step="0.01"
                              value={k.tutar}
                              onInput={(e) => {
                                const liste = [...form.takip.takipOncesiKalemler];
                                liste[idx] = { ...k, tutar: e.currentTarget.value };
                                formGuncelle({ ...form, takip: { ...form.takip, takipOncesiKalemler: liste } });
                              }}
                            />
                          </div>
                          <div class="alan genis">
                            <label for={`icra-oncesi-aciklama-${idx}`}>Açıklama</label>
                            <input
                              id={`icra-oncesi-aciklama-${idx}`}
                              value={k.aciklama}
                              onInput={(e) => {
                                const liste = [...form.takip.takipOncesiKalemler];
                                liste[idx] = { ...k, aciklama: e.currentTarget.value };
                                formGuncelle({ ...form, takip: { ...form.takip, takipOncesiKalemler: liste } });
                              }}
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          class="metin-buton"
                          onClick={() =>
                            formGuncelle({
                              ...form,
                              takip: {
                                ...form.takip,
                                takipOncesiKalemler: form.takip.takipOncesiKalemler.filter((_, i) => i !== idx),
                              },
                            })
                          }
                        >
                          Kalemi sil
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {adim === 2 && (
                <div class="alan-izgarasi">
                  <div class="alan genis">
                    <label class="onay-kutusu">
                      <input
                        type="checkbox"
                        checked={form.takip.pesinHarcAlindiMi}
                        disabled={form.takip.takipTuru === 'ilamli'}
                        onChange={(e) =>
                          formGuncelle({
                            ...form,
                            takip: { ...form.takip, pesinHarcAlindiMi: e.currentTarget.checked },
                          })
                        }
                      />
                      <span>
                        Takip açılışında binde 5 peşin harç alındı (492 s.K. m.28-29; tahsil harcından mahsup edilir)
                      </span>
                    </label>
                  </div>
                  <div class="alan genis">
                    <label for="icra-tahsil-asamasi">İcra tahsil harcı aşaması (492 s.K. B/I-3) *</label>
                    <select
                      id="icra-tahsil-asamasi"
                      value={form.takip.tahsilHarciAsamasi}
                      onChange={(e) =>
                        formGuncelle({
                          ...form,
                          takip: {
                            ...form.takip,
                            tahsilHarciAsamasi: e.currentTarget.value as TahsilHarciAsamasi,
                          },
                        })
                      }
                    >
                      {(Object.keys(TAHSIL_ASAMA_ADLARI) as TahsilHarciAsamasi[]).map((k) => (
                        <option key={k} value={k}>
                          {TAHSIL_ASAMA_ADLARI[k]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div class="alan genis">
                    <label class="onay-kutusu">
                      <input
                        type="checkbox"
                        checked={form.takip.feragatVarMi}
                        onChange={(e) =>
                          formGuncelle({
                            ...form,
                            takip: { ...form.takip, feragatVarMi: e.currentTarget.checked },
                          })
                        }
                      />
                      <span>
                        Takipten feragat / vazgeçme var (492 s.K. m.23: satış öncesi aşamalarda tahsil harcı 1/2 indirimli)
                      </span>
                    </label>
                  </div>
                  <div class="alan">
                    <label for="icra-vekalet">İcra vekalet ücreti (TL) *</label>
                    <input
                      id="icra-vekalet"
                      type="number"
                      step="0.01"
                      value={form.takip.vekaletUcreti}
                      onInput={(e) =>
                        formGuncelle({ ...form, takip: { ...form.takip, vekaletUcreti: e.currentTarget.value } })
                      }
                    />
                  </div>
                  <div class="alan genis">
                    <div class="liste-baslik">
                      <span>Takip masrafları (İİK m.59)</span>
                      <button
                        type="button"
                        onClick={() =>
                          formGuncelle({
                            ...form,
                            takip: {
                              ...form.takip,
                              masraflar: [
                                ...form.takip.masraflar,
                                { tarih: form.takip.takipTarihi, tutar: '0', aciklama: 'Tebligat gideri' },
                              ],
                            },
                          })
                        }
                      >
                        + Masraf ekle
                      </button>
                    </div>
                    {form.takip.masraflar.map((m, idx) => (
                      <div class="satir-karti" key={idx}>
                        <div class="alan-izgarasi">
                          <div class="alan">
                            <label for={`icra-masraf-tarih-${idx}`}>Tarih *</label>
                            <input
                              id={`icra-masraf-tarih-${idx}`}
                              type="date"
                              value={m.tarih}
                              onInput={(e) => {
                                const liste = [...form.takip.masraflar];
                                liste[idx] = { ...m, tarih: e.currentTarget.value };
                                formGuncelle({ ...form, takip: { ...form.takip, masraflar: liste } });
                              }}
                            />
                          </div>
                          <div class="alan">
                            <label for={`icra-masraf-tutar-${idx}`}>Tutar (TL) *</label>
                            <input
                              id={`icra-masraf-tutar-${idx}`}
                              type="number"
                              step="0.01"
                              value={m.tutar}
                              onInput={(e) => {
                                const liste = [...form.takip.masraflar];
                                liste[idx] = { ...m, tutar: e.currentTarget.value };
                                formGuncelle({ ...form, takip: { ...form.takip, masraflar: liste } });
                              }}
                            />
                          </div>
                          <div class="alan genis">
                            <label for={`icra-masraf-aciklama-${idx}`}>Açıklama *</label>
                            <input
                              id={`icra-masraf-aciklama-${idx}`}
                              value={m.aciklama}
                              onInput={(e) => {
                                const liste = [...form.takip.masraflar];
                                liste[idx] = { ...m, aciklama: e.currentTarget.value };
                                formGuncelle({ ...form, takip: { ...form.takip, masraflar: liste } });
                              }}
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          class="metin-buton"
                          onClick={() =>
                            formGuncelle({
                              ...form,
                              takip: {
                                ...form.takip,
                                masraflar: form.takip.masraflar.filter((_, i) => i !== idx),
                              },
                            })
                          }
                        >
                          Masrafı sil
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {adim === 3 && (
                <div class="alan-izgarasi">
                  <div class="alan genis">
                    <div class="liste-baslik">
                      <span>TBK m.100 kısmi ödemeler</span>
                      <button
                        type="button"
                        onClick={() =>
                          formGuncelle({
                            ...form,
                            takip: {
                              ...form.takip,
                              kismiOdemeler: [
                                ...form.takip.kismiOdemeler,
                                { tarih: form.hesapTarihi, tutar: '10000', aciklama: 'Dosya hesabına kısmi ödeme' },
                              ],
                            },
                          })
                        }
                      >
                        + Kısmi ödeme ekle
                      </button>
                    </div>
                    {form.takip.kismiOdemeler.length === 0 && (
                      <p class="ipucu">Dosyada kısmi ödeme yoksa bu adımı boş bırakabilirsiniz.</p>
                    )}
                    {form.takip.kismiOdemeler.map((o, idx) => (
                      <div class="satir-karti" key={idx}>
                        <div class="alan-izgarasi">
                          <div class="alan">
                            <label for={`icra-odeme-tarih-${idx}`}>Ödeme tarihi *</label>
                            <input
                              id={`icra-odeme-tarih-${idx}`}
                              type="date"
                              value={o.tarih}
                              onInput={(e) => {
                                const liste = [...form.takip.kismiOdemeler];
                                liste[idx] = { ...o, tarih: e.currentTarget.value };
                                formGuncelle({ ...form, takip: { ...form.takip, kismiOdemeler: liste } });
                              }}
                            />
                          </div>
                          <div class="alan">
                            <label for={`icra-odeme-tutar-${idx}`}>Ödeme tutarı (TL) *</label>
                            <input
                              id={`icra-odeme-tutar-${idx}`}
                              type="number"
                              step="0.01"
                              value={o.tutar}
                              onInput={(e) => {
                                const liste = [...form.takip.kismiOdemeler];
                                liste[idx] = { ...o, tutar: e.currentTarget.value };
                                formGuncelle({ ...form, takip: { ...form.takip, kismiOdemeler: liste } });
                              }}
                            />
                          </div>
                          <div class="alan genis">
                            <label for={`icra-odeme-aciklama-${idx}`}>Açıklama *</label>
                            <input
                              id={`icra-odeme-aciklama-${idx}`}
                              value={o.aciklama}
                              onInput={(e) => {
                                const liste = [...form.takip.kismiOdemeler];
                                liste[idx] = { ...o, aciklama: e.currentTarget.value };
                                formGuncelle({ ...form, takip: { ...form.takip, kismiOdemeler: liste } });
                              }}
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          class="metin-buton"
                          onClick={() =>
                            formGuncelle({
                              ...form,
                              takip: {
                                ...form.takip,
                                kismiOdemeler: form.takip.kismiOdemeler.filter((_, i) => i !== idx),
                              },
                            })
                          }
                        >
                          Ödemeyi sil
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </form>

            <div class="adim-alt">
              <button disabled={adim === 0} onClick={() => adimYaz(adim - 1)}>
                Önceki adım
              </button>
              <span>* Zorunlu alan</span>
              {adim < 3 ? (
                <button class="birincil" onClick={() => adimYaz(adim + 1)}>
                  Sonraki adım →
                </button>
              ) : (
                <button class="birincil" disabled={!sonuc} onClick={() => sayfaYaz('rapor')}>
                  Raporu hazırla →
                </button>
              )}
            </div>
          </section>

          <aside class="sonuc-paneli" id="sonuc-paneli" aria-label="Canlı icra kapak hesabı sonucu">
            <div class="sonuc-basligi">
              <h2>Kapak özeti</h2>
              <span class={`durum ${sonuc ? 'gecerli' : ''}`}>{sonuc ? 'Güncel' : 'Eksik girdi'}</span>
            </div>
            {sonuc ? (
              <IcraSonuclar sonuc={sonuc} />
            ) : (
              <div class="bos-sonuc">
                <h3>Kapak hesabı için girdileri tamamlayın</h3>
                {hata && (
                  <div class="hata-kutusu">
                    <p>{hataAciklamasi(hata)}</p>
                  </div>
                )}
              </div>
            )}
            <p class="panel-dipnot">
              2548 s.K. m.1 gereği %2 cezaevi harcı borçluya yüklenmez; alacaklıya ödenecek paradan kesilir.
            </p>
          </aside>
        </div>
      )}

      {sayfa === 'rapor' && (
        <section class="rapor-ekrani">
          <div class="sayfa-basligi">
            <div>
              <h1>İcra kapak hesabı raporu ve kayıt</h1>
              <p>Rapor, girdi ve tablo özetleriyle yeniden üretilebilir.</p>
            </div>
          </div>
          <div class="rapor-araclari">
            <button class="birincil" disabled={!sonuc || mesgul} onClick={() => void pdfOlustur()}>
              {mesgul ? 'PDF hazırlanıyor...' : 'PDF raporunu indir'}
            </button>
            <button
              disabled={!sonuc}
              onClick={() => {
                if (sonuc) {
                  indir(
                    icraFormYamli(form),
                    icraKanitDosyaAdi(sonuc, uretimTarihi()).replace(/\.pdf$/, '.yaml'),
                    'application/yaml',
                  );
                  bildir('YAML indirmesi başlatıldı.');
                }
              }}
            >
              Girdiyi YAML indir
            </button>
            <button disabled={!sonuc} onClick={() => void defterKopyala()}>
              Defter satırını kopyala
            </button>
          </div>
          {defterMetni && (
            <label class="defter-yedek">
              Kayıt defteri satırı
              <textarea readOnly value={defterMetni} rows={5} onFocus={(e) => e.currentTarget.select()} />
            </label>
          )}
          {sonuc ? (
            <div class="rapor-onizleme">
              <IcraSonuclar sonuc={sonuc} tam />
            </div>
          ) : (
            <div class="hata-kutusu">
              <p>{hata ? hataAciklamasi(hata) : 'Girdiler henüz tamamlanmadı.'}</p>
              <button onClick={() => sayfaYaz('hesap')}>Girdileri tamamla</button>
            </div>
          )}
        </section>
      )}
    </>
  );
}
