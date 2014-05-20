// The starting code for a monster class
// by Jorge Meneses 4/15/14

var fullMonsterHealth = 10;
//var isDead = false;

// There are 3 types of monsters: weak, normal, and strong. It accepts strings.
// Alive is a boolean if they're currently alive or dead.
// PowerUp is a boolean if they're in a power up mode.
var monster = function(type, alive, powerUp)
{
	var monsterHealth = fullMonsterHealth;
	
	if(type === "weak")
	{
		monsterHealth = fullMonsterHealth / 3; // weak monster has 3 health points
	}
	
	else if(type === "normal")
	{
		monsterHealth = fullMonsterHealth / 2; // normal monster has 5 health points
	}
	
	alive = true;
	powerUp = false;
};

// Player will be 1 of the 4 players: warrior, archer, mage, and rogue. It accepts strings.
var recieveDamage = function(player)
{
	if(powerUp === false)
	{
		if(player === "warrior") health -= 3;
		else if(player === "rogue") health -= 2;
		else health -= 1;
	}
};

var giveDamage = function()
{
	}