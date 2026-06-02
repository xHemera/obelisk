#!/bin/bash

# Script de développement Team Aqua Project

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m' # No Color

# Fonctions
print_header() {
    echo -e "${BLUE}╭──────────────────────────────────────────────╮${NC}"
    echo -e "${BLUE}│${NC} ${BOLD}$1${NC}"
    echo -e "${BLUE}╰──────────────────────────────────────────────╯${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

is_service_running() {
    local service="$1"
    docker compose ps --services --filter status=running 2>/dev/null | grep -qx "$service"
}

is_frontend_online() {
    curl -fsS --max-time 2 http://localhost:3000 >/dev/null 2>&1
}

is_websockets_online() {
    curl -sS --max-time 2 http://localhost:4001 >/dev/null 2>&1
}

status_label() {
    local is_up="$1"
    if [ "$is_up" = "1" ]; then
        echo -e "${GREEN}● EN LIGNE${NC}"
    else
        echo -e "${RED}● HORS LIGNE${NC}"
    fi
}

render_live_status() {
    local db_running=0
    local frontend_running=0
    local websockets_running=0
    local frontend_online=0
    local websockets_online=0

    if is_service_running "db"; then db_running=1; fi
    if is_service_running "frontend"; then frontend_running=1; fi
    if is_service_running "websockets"; then websockets_running=1; fi
    if is_frontend_online; then frontend_online=1; fi
    if is_websockets_online; then websockets_online=1; fi

    echo -e "${CYAN}Infrastructure${NC}"
    echo -e "  DB container          $(status_label "$db_running")"
    echo -e "  Frontend container    $(status_label "$frontend_running")"
    echo -e "  Websockets container  $(status_label "$websockets_running")"
    echo ""
    echo -e "${CYAN}Endpoints${NC}"
    echo -e "  http://localhost:3000         $(status_label "$frontend_online")"
    echo -e "  http://localhost:4001         $(status_label "$websockets_online")"
}

collect_status_snapshot() {
    local db_running=0
    local frontend_running=0
    local websockets_running=0
    local frontend_online=0
    local websockets_online=0

    if is_service_running "db"; then db_running=1; fi
    if is_service_running "frontend"; then frontend_running=1; fi
    if is_service_running "websockets"; then websockets_running=1; fi
    if is_frontend_online; then frontend_online=1; fi
    if is_websockets_online; then websockets_online=1; fi

    echo "${db_running}${frontend_running}${frontend_online}${websockets_running}${websockets_online}"
}

DB_STATUS_LINE=0
FRONTEND_STATUS_LINE=0
WEBSOCKETS_STATUS_LINE=0
FRONTEND_URL_LINE=0
WEBSOCKETS_URL_LINE=0
PROMPT_LINE=0

is_full_ui_available() {
    local rows cols
    rows=$(tput lines 2>/dev/null || echo 24)
    cols=$(tput cols 2>/dev/null || echo 80)

    [ "$rows" -ge "$MIN_FULL_UI_ROWS" ] && [ "$cols" -ge "$MIN_FULL_UI_COLS" ]
}

write_at_line() {
    local line_number="$1"
    local content="$2"
    tput cup "$((line_number - 1))" 0
    printf "\033[2K%s" "$content"
}

draw_menu_shell() {
    clear
    local line=1

    print_header "🌊 Team Aqua • Control Center"
    line=$((line + 3))

    echo ""
    line=$((line + 1))

    echo -e "${CYAN}Infrastructure${NC}"
    line=$((line + 1))

    DB_STATUS_LINE=$line
    echo ""
    line=$((line + 1))

    FRONTEND_STATUS_LINE=$line
    echo ""
    line=$((line + 1))

    WEBSOCKETS_STATUS_LINE=$line
    echo ""
    line=$((line + 1))

    echo -e "${CYAN}Endpoints${NC}"
    line=$((line + 1))

    FRONTEND_URL_LINE=$line
    echo ""
    line=$((line + 1))

    WEBSOCKETS_URL_LINE=$line
    echo ""
    line=$((line + 1))

    echo ""
    line=$((line + 1))

    echo -e "${MAGENTA}Actions${NC}"
    line=$((line + 1))

    echo "  [1] 🚀 Démarrer tous les services"
    line=$((line + 1))
    echo "  [2] 🔄 Redémarrer tous les services"
    line=$((line + 1))
    echo "  [3] 🛑 Arrêter tous les services"
    line=$((line + 1))
    echo "  [4] 🗑️  Arrêter et nettoyer (volumes inclus)"
    line=$((line + 1))
    echo "  [5] 📊 Afficher les logs"
    line=$((line + 1))
    echo "  [6] 🔍 Vérifier le statut"
    line=$((line + 1))
    echo "  [7] 🗄️  Accéder à la base de données"
    line=$((line + 1))
    echo "  [8] 👤 Créer un admin"
    line=$((line + 1))

    echo ""
    line=$((line + 1))

    echo -e "${DIM}Raccourcis: [r] Rafraîchir • [q] Quitter${NC}"
    line=$((line + 1))

    echo ""
    line=$((line + 1))

    PROMPT_LINE=$line
    echo "Choix: "
}

update_menu_status_rows() {
    local db_running=0
    local frontend_running=0
    local websockets_running=0
    local frontend_online=0
    local websockets_online=0

    if is_service_running "db"; then db_running=1; fi
    if is_service_running "frontend"; then frontend_running=1; fi
    if is_service_running "websockets"; then websockets_running=1; fi
    if is_frontend_online; then frontend_online=1; fi
    if is_websockets_online; then websockets_online=1; fi

    write_at_line "$DB_STATUS_LINE" "  DB container          $(status_label "$db_running")"
    write_at_line "$FRONTEND_STATUS_LINE" "  Frontend container    $(status_label "$frontend_running")"
    write_at_line "$WEBSOCKETS_STATUS_LINE" "  Websockets container  $(status_label "$websockets_running")"
    write_at_line "$FRONTEND_URL_LINE" "  http://localhost:3000         $(status_label "$frontend_online")"
    write_at_line "$WEBSOCKETS_URL_LINE" "  http://localhost:4001         $(status_label "$websockets_online")"
}

update_menu_prompt_line() {
    write_at_line "$PROMPT_LINE" "Choix: "
}

render_compact_menu() {
    local db_running=0
    local frontend_running=0
    local websockets_running=0
    local frontend_online=0
    local websockets_online=0

    if is_service_running "db"; then db_running=1; fi
    if is_service_running "frontend"; then frontend_running=1; fi
    if is_service_running "websockets"; then websockets_running=1; fi
    if is_frontend_online; then frontend_online=1; fi
    if is_websockets_online; then websockets_online=1; fi

    clear
    print_header "🌊 Team Aqua • Kyogre Control Center"
    echo ""
    echo -e "${CYAN}${BOLD}Infra${NC}"
    echo -e "${BLUE}${NC} ${BOLD}DB${NC}:        $(status_label "$db_running")"
    echo -e "${BLUE}${NC} ${BOLD}Frontend${NC}:  $(status_label "$frontend_running") ${DIM}/${NC} ${CYAN}󰖟 URL${NC} $(status_label "$frontend_online")"
    echo -e "${BLUE}${NC} ${BOLD}Websocket${NC}: $(status_label "$websockets_running") ${DIM}/${NC} ${CYAN}󰖟 URL${NC} $(status_label "$websockets_online")"
    echo ""
    echo -e "${MAGENTA}${BOLD}Actions${NC}"
    echo -e "${GREEN}[1]${NC}  Start   ${YELLOW}[2]${NC}  Restart   ${RED}[3]${NC}  Stop   ${CYAN}[4]${NC} 󰃢 Clean"
    echo -e "${GREEN}[5]${NC}  Logs    ${YELLOW}[6]${NC}  Statut    ${RED}[7]${NC} 󱙋 DB"
    echo ""
    echo -e "${DIM}Raccourcis: [r] Rafraîchir • [q] Quitter${NC}"
    echo -ne "${BOLD}${CYAN}Choix:${NC} "
}

show_menu_compact() {
    choice=""
    local last_snapshot=""
    local force_redraw=1

    while [ -z "$choice" ]; do
        local current_snapshot
        current_snapshot="$(collect_status_snapshot)"

        if [ "$force_redraw" = "1" ] || [ "$current_snapshot" != "$last_snapshot" ]; then
            render_compact_menu
            last_snapshot="$current_snapshot"
            force_redraw=0
        fi

        local key=""
        read -rsn1 -t 1 key || true
        case "$key" in
            [1-8]) choice="$key" ;;
            [rR]) force_redraw=1 ;;
            [qQ]) choice="0" ;;
            *) ;;
        esac
    done

    echo ""
}

wait_for_url() {
    local url="$1"
    local label="$2"
    local timeout_seconds="${3:-180}"
    local interval_seconds=2
    local elapsed=0
    local spinner='⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'
    local spin_index=0

    print_info "Attente de disponibilité: $label ($url)"
    while ! curl -fsS --max-time 2 "$url" >/dev/null 2>&1; do
        elapsed=$((elapsed + interval_seconds))
        if [ "$elapsed" -ge "$timeout_seconds" ]; then
            print_error "$label indisponible après ${timeout_seconds}s"
            return 1
        fi
        spin_index=$(( (spin_index + 1) % ${#spinner} ))
        local frame="${spinner:$spin_index:1}"
        echo -ne "\r${YELLOW}${frame} En attente de $label... ${elapsed}/${timeout_seconds}s${NC}"
        sleep "$interval_seconds"
    done

    echo ""
    print_success "$label accessible"
}

wait_any_key() {
    read -rsn1 -p "↵ Appuyez sur une touche pour revenir au menu..." _
    echo ""
}

# Vérifier que Docker est en cours d'exécution
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker n'est pas en cours d'exécution"
        exit 1
    fi
    print_success "Docker est prêt"
}

# Menu principal
show_menu() {
    show_menu_compact
}

# Démarrer les services
start_services() {
    print_header "Démarrage des services"
    
    # Créer les dossiers nécessaires s'ils n'existent pas
    mkdir -p frontend/public/images
    mkdir -p frontend/public/profiles
    
    docker compose up --build -d

    wait_for_url "http://localhost:3000" "Frontend" 300

    print_success "Services démarrés et site accessible"
    print_info "Frontend: http://localhost:3000"
    print_info "websockets: http://localhost:4001/health"
}

# Redémarrer les services
restart_services() {
    print_header "Redémarrage des services"
    docker compose restart

    wait_for_url "http://localhost:3000" "Frontend" 300

    print_success "Services redémarrés et site accessible"
}

# Arrêter les services
stop_services() {
    print_header "Arrêt des services"
    docker compose down
    print_success "Services arrêtés"
}

# Nettoyer complètement
clean_all() {
    print_header "Nettoyage complet"
    read -p "⚠️  Cela supprimera tous les volumes (base de données). Continuer? (y/N): " confirm
    if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
        rm -rf frontend/public/images/*
        rm -rf frontend/public/profiles/*
        docker compose down -v
        print_success "Nettoyage terminé"
    else
        print_info "Annulé"
    fi
}

# Afficher les logs
show_logs() {
    print_header "Logs des services"
    echo "1. Tous"
    echo "2. Frontend"
    echo "3. websockets"
    echo "4. Database"
    read -rsn1 -p "Service (1-4): " service_choice
    echo ""

    case $service_choice in
        1) docker compose logs -f ;;
        2) docker compose logs frontend -f ;;
        3) docker compose logs websockets -f ;;
        4) docker compose logs db -f ;;
        *) print_error "Choix invalide" ;;
    esac
}

# Vérifier le statut
check_status() {
    print_header "Statut des services"
    docker compose ps
    echo ""

    # Tester les endpoints
    print_info "Test du websockets..."
    if curl -fsS http://localhost:4001/health > /dev/null 2>&1; then
        print_success "websockets: OK"
    else
        print_error "websockets: KO"
    fi

    print_info "Test du frontend..."
    if is_frontend_online; then
        print_success "Frontend: OK"
    else
        print_error "Frontend: KO"
    fi
}

# Accéder à la base de données
access_db() {
    print_header "Accès PostgreSQL"
    docker compose exec db psql -U postgres -d aqua_temp
}

# Tester les services
test_services() {
    print_header "Test des services"

    echo "websockets Health:"
    curl -fsS http://localhost:4001/health | jq '.' 2>/dev/null || curl -fsS http://localhost:4001/health

    echo ""
    echo "Utilisateurs (premiers 3):"
    curl -fsS http://localhost:4001/api/users | jq '.[0:3]' 2>/dev/null || curl -fsS http://localhost:4001/api/users
}

# Boucle principale
main() {
    check_docker

    while true; do
        echo ""
        show_menu

        case $choice in
            1) start_services ;;
            2) restart_services ;;
            3) stop_services ;;
            4) clean_all ;;
            5) show_logs ;;
            6) check_status ;;
            7) access_db ;;
            0) print_success "Au revoir!"; exit 0 ;;
            *) print_error "Choix invalide" ;;
        esac

        echo ""
        wait_any_key
    done
}
main
