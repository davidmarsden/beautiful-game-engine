const $ = (id) => document.getElementById(id);
let state = null;

function playerName(player){return player.display_name||player.player_name||player.canonical_name||player.tbg_player_id}
function playerRating(player){return player.underlying_ability_rating||player.tbg_rating||player.tbgRating||player.rating||"—"}
function playerPosition(player){return player.position_group||player.positionGroup||player.position_category||player.primary_position||player.position||"—"}

function showView(name){
  document.querySelectorAll('.view').forEach(view=>view.classList.toggle('active',view.id===`${name}View`));
  document.querySelectorAll('[data-view]').forEach(button=>button.classList.toggle('active',button.dataset.view===name));
}

function renderNavigation(items){
  $('clubNav').innerHTML=items.map((item,index)=>`<a href="#" data-nav="${item.toLowerCase().replaceAll(' ','-')}">${item}</a>`).join('');
  $('clubNav').querySelectorAll('a').forEach((link,index)=>link.addEventListener('click',event=>{event.preventDefault();if(index===1)showView('squad');else if(index===2)showView('tactics');else if(index===3)showView('schedule');else showView('dashboard')}));
}

function pickRow(player,zone,index){
  return `<label class="player-pick"><input type="checkbox" data-zone="${zone}" value="${player.tbg_player_id}" ${zone==='xi'&&index<11?'checked':''}> <span>${playerName(player)} · ${playerPosition(player)} · ${playerRating(player)}</span></label>`;
}

function refreshCaptain(){
  const selected=[...document.querySelectorAll('input[data-zone="xi"]:checked')];
  $('captain').innerHTML=selected.map(input=>{const player=state.squad.find(row=>row.tbg_player_id===input.value);return `<option value="${input.value}">${playerName(player)}</option>`}).join('');
}

function render(data){
  state=data;
  renderNavigation(data.navigation);
  $('managerChip').textContent=data.manager.manager_name;
  $('clubName').textContent=data.club.canonical_name;
  $('crest').textContent=(data.club.short_name||data.club.canonical_name).split(/\s+/).map(word=>word[0]).join('').slice(0,3).toUpperCase();
  $('clubMeta').textContent=`${data.club.division_id?data.club.division_id.replace('division-','Division '):'Unseeded'} · World rank ${data.club.strength?.world_rank||'—'}`;
  $('nextOpponent').textContent=data.next_fixture.opponent_name;
  $('fixtureMeta').textContent=data.next_fixture.competition;
  $('worldName').textContent='TBG World 1';
  $('worldStatus').textContent=data.world.status;
  $('nextFixtureCard').textContent=`${data.next_fixture.opponent_name} · ${data.next_fixture.venue}`;
  $('division').textContent=data.club.division_id?data.club.division_id.replace('division-','Division '):'—';
  $('rank').textContent=data.club.strength?.world_rank||'—';
  $('squadCount').textContent=data.squad.length;
  $('squadRows').innerHTML=[...data.squad].sort((a,b)=>Number(playerRating(b))-Number(playerRating(a))).map(player=>`<tr><td>${playerName(player)}</td><td>${playerPosition(player)}</td><td>${player.age??'—'}</td><td>${playerRating(player)}</td><td>${player.assignment_status||'assigned'}</td></tr>`).join('');
  const ordered=[...data.squad].sort((a,b)=>Number(playerRating(b))-Number(playerRating(a)));
  $('startingXi').innerHTML=ordered.map((player,index)=>pickRow(player,'xi',index)).join('');
  $('bench').innerHTML=ordered.map((player,index)=>pickRow(player,'bench',index)).join('');
  document.querySelectorAll('input[data-zone="xi"]').forEach(input=>input.addEventListener('change',refreshCaptain));
  refreshCaptain();
}

async function submitDecision(event){
  event.preventDefault();
  const startingXi=[...document.querySelectorAll('input[data-zone="xi"]:checked')].map(input=>input.value);
  const bench=[...document.querySelectorAll('input[data-zone="bench"]:checked')].map(input=>input.value);
  const payload={
    manager_id:state.manager.manager_id,
    club_id:state.club.tbg_club_id,
    fixture_id:state.next_fixture.fixture_id,
    formation:$('formation').value,
    starting_xi:startingXi,
    bench,
    captain_id:$('captain').value,
    set_piece_takers:{penalties:$('captain').value,free_kicks:$('captain').value,corners_left:$('captain').value,corners_right:$('captain').value},
    tactics:{mentality:$('mentality').value,pressing:$('pressing').value,tempo:$('tempo').value,width:$('width').value,defensive_line:$('defensiveLine').value}
  };
  const response=await fetch('/api/decisions',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
  const result=await response.json();
  $('submissionStatus').className=response.ok?'ok':'error';
  $('submissionStatus').textContent=response.ok?`Team submitted at ${new Date(result.submitted_at).toLocaleString()}`:(result.validation_errors||[result.error]).join(' · ');
}

document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>showView(button.dataset.view)));
document.querySelectorAll('[data-tab]').forEach(button=>button.addEventListener('click',()=>showView(button.dataset.tab)));
$('decisionForm').addEventListener('submit',submitDecision);

fetch('/api/bootstrap').then(response=>response.json()).then(render).catch(error=>{$('clubName').textContent='Could not load world';$('clubMeta').textContent=error.message});
