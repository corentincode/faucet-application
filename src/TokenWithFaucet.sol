// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract FaucetToken is ERC20, Ownable {
    uint256 public dailyLimit = 100 * 10**18; // 100 tokens per day
    mapping(address => uint256) public lastRequestTime;
    mapping(address => uint256) public dailyUsage;

    constructor() ERC20("Test Token", "TEST") Ownable(msg.sender) {}

    function mint(address to, uint256 amount) public {
        // Reset daily usage if it's a new day
        if (block.timestamp >= lastRequestTime[to] + 1 days) {
            dailyUsage[to] = 0;
            lastRequestTime[to] = block.timestamp;
        }

        // Check if the request exceeds the daily limit
        require(dailyUsage[to] + amount <= dailyLimit, "Daily limit exceeded");

        // Update the user's daily usage
        dailyUsage[to] += amount;

        // Mint the tokens
        _mint(to, amount);
    }

    function userDailyUsage(address user) public view returns (uint256) {
        if (block.timestamp >= lastRequestTime[user] + 1 days) {
            return 0;
        }
        return dailyUsage[user];
    }

    function setDailyLimit(uint256 newLimit) public onlyOwner {
        dailyLimit = newLimit;
    }
}