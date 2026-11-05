# ASRIA

Website statis enam halaman untuk subtema **Going Green Through Smart Digital Solutions**. ASRIA membantu pelajar membaca pola perjalanan, memperkirakan emisi dengan faktor contoh, membandingkan alternatif, dan mencatat tindakan yang telah dicoba.

## Menjalankan lokal

Dari direktori proyek, jalankan `python -m http.server 8000`, lalu buka `http://localhost:8000/`. Server lokal diperlukan karena JavaScript memakai ES modules. Tidak ada proses build atau paket JavaScript yang diperlukan.

## Halaman dan data

- `index.html`: pengantar dan rute contoh interaktif.
- `pages/emisi.html`: penjelasan sumber emisi dan kuis.
- `pages/jejak.html`: pengukur empat langkah.
- `pages/lab.html`: perbandingan perjalanan awal dan skenario baru.
- `pages/aksi.html`: tujuh langkah yang dapat dicatat.
- `pages/profile.html`: pengaturan profil lokal.

Jejak, skenario, dan catatan aksi disimpan hanya di penyimpanan lokal browser. Angka emisi adalah **contoh edukatif**, bukan pengukuran langsung atau penghematan yang telah terjadi. Penjelasan faktor tersedia melalui tombol “Lihat Cara Menghitung” di halaman Jejak.

Peta Home mendukung pilihan rute, putar/jeda, perbesar, dan geser. Saat belum diputar, angka menunjukkan estimasi total. Saat diputar, CO₂e bertambah mengikuti jarak yang sudah ditempuh. Saat peta diperbesar, tombol panah juga dapat menggeser tampilan. Kartu faktor dan langkah ASRIA dibalik dengan hover di desktop, tap di touchscreen, atau Enter/Space lewat keyboard. Di desktop, kuis menempatkan jawaban dan penjelasan berdampingan.

Profil merangkum pengukuran yang disimpan di Jejak, skenario yang disimpan lewat tombol Simpan skenario di Lab, hasil kuis Emisi, dan langkah yang dicatat di Aksi. Kondisi tanpa data ditampilkan kosong. Angka ringkasan merupakan estimasi dari rute yang diukur, bukan bukti perjalanan atau penghematan aktual.

Gunakan profil dengan nama tampilan untuk membuka sesi lokal. Logout mengakhiri sesi tanpa menghapus catatan, lalu menampilkan halaman masuk profil. Profil memakai penyimpanan browser pada perangkat yang sama, tanpa kata sandi, backend, atau sinkronisasi antar perangkat. Ini bukan autentikasi akun daring.

## Atribusi

Ilustrasi rute, kendaraan, ikon, dan animasi dibuat dengan SVG/CSS dalam proyek ini. Font DM Sans dan Outfit dimuat dari Google Fonts dengan lisensi SIL Open Font License 1.1; tautan sumber dan lisensi dicatat pada komentar `css/main.css`.

Logo navbar (`media/asria-logo-navbar.png`) dibuat dari logo ASRIA yang disediakan pemilik proyek melalui ImageGen bawaan. Prompt: pertahankan siluet A, pita jalan/daun dan titik, ubah bagian teal ke ivory #f4f1e8, pertahankan aksen hijau, rapikan tepi dan gunakan latar transparan. Logo asli tetap tersedia di `media/asria-logo.png`.
