# manager.py
import tkinter as tk
from tkinter import ttk, scrolledtext, PanedWindow, messagebox
import subprocess
import os
import re
import time
import threading
import queue
import sys
import shutil

# --- Konfigūracija ---
ENV_FILE_PATH = ".env"
ENV_EXAMPLE_FILE_PATH = ".env.example"
ENV_DOCKER_FILE_PATH = ".env.docker"
DOCKER_DATABASE_URL = "postgresql://postgres:password@db:5432/lucidehive?schema=public"
LOCAL_DATABASE_URL = "postgresql://postgres:password@localhost:5432/lucidehive?schema=public"
DOCKER_REDIS_URL = "redis://redis:6379"
LOCAL_REDIS_URL = "redis://127.0.0.1:6379"

# --- Pagrindinė GUI Aplikacijos Klasė ---
class ProjectManagerApp:
    def __init__(self, master):
        self.master = master
        self.master.title("Lucid Hive Manager v2.0")
        self.master.geometry("1000x750")
        self.master.minsize(800, 600)

        self.processes = {}  # Žodynas aktyviems procesams saugoti
        self.queue = queue.Queue()

        self.configure_styles()
        self.create_widgets()
        self.process_queue()
        
        self.master.after(100, self.initial_checks)
        self.master.protocol("WM_DELETE_WINDOW", self.on_closing)

    def configure_styles(self):
        """Konfigūruoja visus GUI elementų stilius."""
        BG_COLOR = "#282c34"
        FG_COLOR = "#abb2bf"
        BTN_BG = "#61afef"
        BTN_SUCCESS_BG = "#98c379"
        BTN_DESTRUCTIVE_BG = "#e06c75"
        
        self.master.configure(bg=BG_COLOR)
        self.style = ttk.Style()
        self.style.theme_use("clam")
        
        self.style.configure('.', background=BG_COLOR, foreground=FG_COLOR, font=('Segoe UI', 10))
        self.style.configure('TFrame', background=BG_COLOR)
        self.style.configure('TLabel', background=BG_COLOR, foreground=FG_COLOR)
        self.style.configure('TLabelframe', background=BG_COLOR, bordercolor="#4b5563")
        self.style.configure('TLabelframe.Label', background=BG_COLOR, foreground=FG_COLOR, font=('Segoe UI', 10, 'bold'))
        
        self.style.configure("TButton", padding=8, relief="flat", borderwidth=0, font=('Segoe UI', 9, 'bold'), foreground='white')
        self.style.map("TButton", background=[('!disabled', BTN_BG), ('disabled', '#4b5563')])
        
        self.style.configure("Success.TButton", background=BTN_SUCCESS_BG)
        self.style.configure("Destructive.TButton", background=BTN_DESTRUCTIVE_BG)

        self.style.configure("TNotebook", background=BG_COLOR, borderwidth=0)
        self.style.configure("TNotebook.Tab", padding=[12, 6], font=('Segoe UI', 10, 'bold'), background="#3a3f4b", foreground=FG_COLOR, borderwidth=0)
        self.style.map("TNotebook.Tab", background=[("selected", BG_COLOR)], foreground=[("selected", "white")])

    def create_widgets(self):
        """Sukuria visus GUI elementus."""
        main_paned_window = PanedWindow(self.master, orient=tk.HORIZONTAL, sashrelief=tk.RAISED, bg="#21252b")
        main_paned_window.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)

        control_panel = ttk.Frame(main_paned_window, width=280)
        self.create_control_panel(control_panel)
        main_paned_window.add(control_panel, stretch="never")

        log_panel = ttk.Frame(main_paned_window)
        self.create_log_panel(log_panel)
        main_paned_window.add(log_panel, stretch="always")

        self.status_bar = ttk.Label(self.master, text="  Statusas: Laukia komandos", anchor=tk.W, relief=tk.SUNKEN)
        self.status_bar.pack(side=tk.BOTTOM, fill=tk.X)

    def create_control_panel(self, parent):
        """Sukuria kairįjį valdymo skydelį su visais mygtukais."""
        self.buttons = {}
        
        docker_frame = ttk.LabelFrame(parent, text="🐳 Docker Valdymas", padding=10)
        docker_frame.pack(fill=tk.X, pady=5)
        self.buttons['full_start'] = ttk.Button(docker_frame, text="🚀 Visiškas Paleidimas", command=lambda: self.run_threaded(self._full_start_worker), style="Success.TButton")
        self.buttons['quick_start'] = ttk.Button(docker_frame, text="🔄 Greitas Paleidimas", command=lambda: self.run_threaded(self._quick_start_worker))
        self.buttons['stop'] = ttk.Button(docker_frame, text="🛑 Sustabdyti ir Išvalyti", command=lambda: self.run_threaded(self._stop_clean_worker), style="Destructive.TButton")
        self.buttons['status'] = ttk.Button(docker_frame, text="📊 Būsena", command=lambda: self.run_threaded(self._status_worker))
        for name in ['full_start', 'quick_start', 'stop', 'status']: self.buttons[name].pack(fill=tk.X, pady=4)

        dev_frame = ttk.LabelFrame(parent, text="💻 Lokalus Vystymas", padding=10)
        dev_frame.pack(fill=tk.X, pady=5)
        
        self.buttons['dev_server_start'] = ttk.Button(dev_frame, text="▶️ Paleisti Next.js Serverį", command=lambda: self.run_threaded(lambda: self._start_long_process_worker("dev", ["npm", "run", "dev"], "Next.js serveris")))
        self.buttons['dev_server_start'].pack(fill=tk.X, pady=4)
        self.buttons['dev_server_stop'] = ttk.Button(dev_frame, text="⏹️ Sustabdyti Next.js Serverį", command=lambda: self.stop_long_process("dev"), state="disabled", style="Destructive.TButton")
        self.buttons['dev_server_stop'].pack(fill=tk.X, pady=4)

        self.buttons['worker_start'] = ttk.Button(dev_frame, text="▶️ Paleisti Worker", command=lambda: self.run_threaded(lambda: self._start_long_process_worker("worker", ["npm", "run", "worker"], "Worker procesas")))
        self.buttons['worker_start'].pack(fill=tk.X, pady=(10, 4))
        self.buttons['worker_stop'] = ttk.Button(dev_frame, text="⏹️ Sustabdyti Worker", command=lambda: self.stop_long_process("worker"), state="disabled", style="Destructive.TButton")
        self.buttons['worker_stop'].pack(fill=tk.X, pady=4)

        db_frame = ttk.LabelFrame(parent, text="🗃️ Duomenų Bazė", padding=10)
        db_frame.pack(fill=tk.X, pady=5)
        self.buttons['db_push'] = ttk.Button(db_frame, text="🛠️ Sinchronizuoti DB Schemą", command=lambda: self.run_threaded(self._db_push_worker))
        self.buttons['db_push'].pack(fill=tk.X, pady=4)
        self.buttons['prisma_studio_start'] = ttk.Button(db_frame, text="👁️ Atidaryti Prisma Studio", command=lambda: self.run_threaded(lambda: self._start_long_process_worker("studio", ["npm", "run", "db:studio"], "Prisma Studio")))
        self.buttons['prisma_studio_start'].pack(fill=tk.X, pady=4)

    def create_log_panel(self, parent):
        """Sukuria dešinįjį skydelį su log'ų skirtukais."""
        self.log_notebook = ttk.Notebook(parent)
        self.log_notebook.pack(fill=tk.BOTH, expand=True)
        self.log_tabs = {
            'manager': self.create_log_tab("Manager"),
            'dev': self.create_log_tab("Next.js Server"),
            'worker': self.create_log_tab("Worker"),
            'studio': self.create_log_tab("Prisma Studio")
        }

    def create_log_tab(self, name):
        tab = ttk.Frame(self.log_notebook)
        self.log_notebook.add(tab, text=name)
        log_text = scrolledtext.ScrolledText(tab, wrap=tk.WORD, bg="#1e1e1e", fg="#d4d4d4", font=("Consolas", 10), relief=tk.FLAT, borderwidth=0)
        log_text.pack(fill=tk.BOTH, expand=True)
        self.configure_log_tags(log_text)
        return log_text

    def configure_log_tags(self, text_widget):
        tags = {
            'SUCCESS': {'foreground': '#98c379', 'font': ("Consolas", 10, "bold")},
            'WARNING': {'foreground': '#e5c07b'},
            'ERROR': {'foreground': '#e06c75', 'font': ("Consolas", 10, "bold")},
            'INFO': {'foreground': '#d4d4d4'},
            'STEP': {'foreground': '#c678dd', 'font': ("Consolas", 10, "bold", "underline")},
            'CMD': {'foreground': '#61afef', 'font': ("Consolas", 10, "italic")}
        }
        for name, config in tags.items():
            text_widget.tag_config(name, **config)

    def process_queue(self):
        try:
            while True:
                target_tab, message, tag = self.queue.get_nowait()
                log_widget = self.log_tabs.get(target_tab, self.log_tabs['manager'])
                log_widget.insert(tk.END, f"{message}\n", tag)
                log_widget.see(tk.END)
        except queue.Empty:
            pass
        self.master.after(100, self.process_queue)

    def log(self, message, tag='INFO', tab='manager'):
        self.queue.put((tab, message, tag))

    def set_status(self, text):
        self.master.after(0, lambda: self.status_bar.config(text=f"  Statusas: {text}"))

    def run_threaded(self, target_func):
        threading.Thread(target=target_func, daemon=True).start()

    def set_all_buttons_state(self, state):
        for btn in self.buttons.values():
            btn['state'] = state

    def run_command(self, command, description, quiet=False):
        self.log(f"▶️  {description}", 'STEP')
        self.log(f"   Vykdoma: {' '.join(command)}", 'CMD')
        self.set_status(f"Vykdoma: {description}")
        try:
            result = subprocess.run(command, capture_output=True, text=True, check=True, creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0, shell=True)
            if not quiet:
                if result.stdout: self.log(result.stdout.strip(), 'INFO')
                if result.stderr: self.log(result.stderr.strip(), 'WARNING')
            self.log("✅ Sėkmingai įvykdyta.", 'SUCCESS')
            return True
        except subprocess.CalledProcessError as e:
            self.log(f"❌ Komanda nepavyko (kodas {e.returncode}):\n{e.stderr}", 'ERROR')
            return False
        finally:
            self.set_status("Laukia komandos")

    def _start_long_process_worker(self, key, command, name):
        if key in self.processes:
            self.log(f"Procesas '{name}' jau veikia.", 'WARNING'); return

        # <<<--- PRIDĖKITE ŠĮ BLOKĄ
        if key in ["dev", "worker", "studio"]:
            self.update_env_file('local')
        # --->>> PABAIGA

        self.log(f"▶️  Paleidžiamas {name}...", 'STEP')
        self.log(f"   Vykdoma: {' '.join(command)}", 'CMD')
        self.set_status(f"Vykdomas: {name}")
        self.master.after(0, lambda: self.buttons[f'{key}_start' if f'{key}_start' in self.buttons else f'{key}'].config(state='disabled'))
        if f'{key}_stop' in self.buttons: self.master.after(0, lambda: self.buttons[f'{key}_stop'].config(state='normal'))

        try:
            process = subprocess.Popen(
                command, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True,
                creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0, shell=True
            )
            self.processes[key] = process
            
            if process.stdout:
                for line in iter(process.stdout.readline, ''):
                    self.log(line.strip(), 'INFO', tab=key)
            
            process.wait()
            if process.returncode != 0 and process.returncode is not None:
                self.log(f"Procesas '{name}' baigėsi su klaidos kodu: {process.returncode}", 'ERROR', tab=key)
            else:
                self.log(f"Procesas '{name}' baigtas.", 'SUCCESS', tab=key)

        except Exception as e:
            self.log(f"❌ Klaida paleidžiant '{name}': {e}", 'ERROR', tab=key)
        finally:
            if key in self.processes: del self.processes[key]
            self.set_status("Laukia komandos")
            self.master.after(0, lambda: self.buttons[f'{key}_start' if f'{key}_start' in self.buttons else f'{key}'].config(state='normal'))
            if f'{key}_stop' in self.buttons: self.master.after(0, lambda: self.buttons[f'{key}_stop'].config(state='disabled'))

    def stop_long_process(self, key):
        if key in self.processes:
            self.log(f"⏹️  Stabdomas '{key}' procesas...", 'WARNING')
            self.processes[key].terminate()
        else:
            self.log(f"Procesas '{key}' neveikia.", 'INFO')

    def update_env_file(self, target_mode):
        self.set_status(f"Atnaujinamas .env failas '{target_mode}' režimui...")
        if not os.path.exists(ENV_FILE_PATH):
            self.log(f"'{ENV_FILE_PATH}' failas nerastas.", 'WARNING'); return

        with open(ENV_FILE_PATH, 'r') as f: content = f.read()
        if target_mode == 'docker':
            content = re.sub(r"^(DATABASE_URL=).*$", f"\\1{DOCKER_DATABASE_URL}", content, flags=re.MULTILINE)
            content = re.sub(r"^(REDIS_URL=).*$", f"\\1{DOCKER_REDIS_URL}", content, flags=re.MULTILINE)
        else:
            content = re.sub(r"^(DATABASE_URL=).*$", f"\\1{LOCAL_DATABASE_URL}", content, flags=re.MULTILINE)
            content = re.sub(r"^(REDIS_URL=).*$", f"\\1{LOCAL_REDIS_URL}", content, flags=re.MULTILINE)
        
        with open(ENV_FILE_PATH, 'w') as f: f.write(content)
        self.log(f"'{ENV_FILE_PATH}' failas atnaujintas '{target_mode}' režimui.", 'SUCCESS')
        self.set_status("Laukia komandos")
        
    def _full_start_worker(self):
        self.set_all_buttons_state('disabled')
        self.log_tabs['manager'].delete(1.0, tk.END)
        
        if not self.run_command(["docker-compose", "down", "-v"], "Stabdomi ir valomi seni konteineriai..."): self.set_all_buttons_state('normal'); return
        
        self.update_env_file('docker')
        if not self.run_command(["docker-compose", "up", "-d", "--build"], "Kuriami ir paleidžiami Docker konteineriai..."): self.set_all_buttons_state('normal'); return
        
        self.log("⏳ Laukiama, kol DB pasileis (10s)...", 'WARNING'); time.sleep(10)
        
        if not self._db_push_worker(log=False): self.set_all_buttons_state('normal'); return
        
        self.update_env_file('docker')
        
        self.log("\n🎉🎉🎉 Projektas sėkmingai paleistas! 🎉🎉🎉", 'SUCCESS')
        self.log("Naršyklėje atidarykite http://localhost:3000", 'INFO')
        self.set_all_buttons_state('normal')

    def _quick_start_worker(self):
        self.set_all_buttons_state('disabled')
        self.log_tabs['manager'].delete(1.0, tk.END)
        self.update_env_file('docker')
        self.run_command(["docker-compose", "up", "-d"], "Paleidžiami/perkraunami esami konteineriai...")
        self.set_all_buttons_state('normal')

    def _stop_clean_worker(self):
        self.set_all_buttons_state('disabled')
        self.log_tabs['manager'].delete(1.0, tk.END)
        self.run_command(["docker-compose", "down", "-v"], "Stabdomi ir valomi visi Docker konteineriai...")
        self.set_all_buttons_state('normal')
        
    def _status_worker(self):
        self.set_all_buttons_state('disabled')
        self.log_tabs['manager'].delete(1.0, tk.END)
        self.run_command(["docker-compose", "ps"], "Tikrinama konteinerių būsena...")
        self.set_all_buttons_state('normal')
    
    def _db_push_worker(self, log=True):
        if log: self.log_tabs['manager'].delete(1.0, tk.END)
        self.update_env_file('local')
        result = self.run_command(["npm", "run", "db:push"], "Sinchronizuojama DB schema...")
        self.update_env_file('docker')
        return result

    def initial_checks(self):
        """Vykdo pradinius patikrinimus ir paruošiamuosius darbus."""
        self.log("--- Lucid Hive Manager v2.0 ---", 'STEP')
        
        if not self.check_dependencies():
            messagebox.showerror("Klaida", "Trūksta būtinų priklausomybių (Docker arba NPM). Patikrinkite 'Manager' log'us.")
            self.set_all_buttons_state('disabled')
            return
            
        self.check_and_create_env_docker()
    
    def check_dependencies(self):
        self.log("🔍 Tikrinamos priklausomybės...", 'STEP')
        docker_ok = shutil.which("docker") and shutil.which("docker-compose")
        npm_ok = shutil.which("npm")
        
        self.log(f"   - Docker & Docker Compose: {'Rasta' if docker_ok else 'NERASTA'}", 'SUCCESS' if docker_ok else 'ERROR')
        self.log(f"   - NPM: {'Rasta' if npm_ok else 'NERASTA'}", 'SUCCESS' if npm_ok else 'ERROR')
        
        return all([docker_ok, npm_ok])

    def check_and_create_env_docker(self):
        if not os.path.exists(ENV_DOCKER_FILE_PATH):
            self.log(f"Failas '{ENV_DOCKER_FILE_PATH}' nerastas.", 'WARNING')
            if os.path.exists(ENV_EXAMPLE_FILE_PATH):
                if messagebox.askyesno("Sukurti .env.docker?", f"Failas '{ENV_DOCKER_FILE_PATH}' būtinas Docker veikimui, bet nerastas. Ar norite jį sukurti nukopijuojant turinį iš '{ENV_EXAMPLE_FILE_PATH}'?"):
                    try:
                        shutil.copy(ENV_EXAMPLE_FILE_PATH, ENV_DOCKER_FILE_PATH)
                        self.log(f"Sėkmingai sukurtas '{ENV_DOCKER_FILE_PATH}'.", 'SUCCESS')
                    except Exception as e:
                        self.log(f"Klaida kuriant '{ENV_DOCKER_FILE_PATH}': {e}", 'ERROR')
            else:
                 self.log(f"Nerastas ir pavyzdinis '{ENV_EXAMPLE_FILE_PATH}' failas. Sukurkite '{ENV_DOCKER_FILE_PATH}' rankiniu būdu.", 'ERROR')

    def on_closing(self):
        """Užtikrina, kad visi foniniai procesai būtų sustabdyti uždarant programą."""
        if self.processes:
            if messagebox.askyesno("Uždaryti?", "Yra aktyvių procesų. Ar tikrai norite juos nutraukti ir išeiti?"):
                for key in list(self.processes.keys()):
                    self.stop_long_process(key)
                self.master.destroy()
        else:
            self.master.destroy()

if __name__ == "__main__":
    try:
        root = tk.Tk()
        app = ProjectManagerApp(root)
        root.mainloop()
    except Exception as e:
        messagebox.showerror("Kritinė Klaida", f"Įvyko kritinė klaida:\n\n{e}\n\nPatikrinkite terminalo išvestį.")
