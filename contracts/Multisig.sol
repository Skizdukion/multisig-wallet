// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "hardhat/console.sol";

/// @notice This enum use for seperate modify authority callback function
enum MultiSigCallBackType {
    ADD_OWNER,
    REMOVE_OWNER,
    SECURITY_LEVEL_PERCENTAGE_CHANGE,
    NEW_SUBMIT_TRANSACTION_SECURITYLEVEL_CHANGE,
    TIME_LIMIT_EACH_TRANS_CHANGE
}

/// @notice This struct would carries data about which kind of callback function and their parameter
struct MultiSigCallBack {
    MultiSigCallBackType functionType;
    bytes encodedData;
}

/// @notice Transaction could represent anything normal activities from a normal wallet
/// @notice In this contract, transaction could also change some authority value like add owner, remove owner, …
struct Transaction {
    address to;
    uint256 value;
    bytes data;
    bool executed;
    bool autoExecWhenEnoughConfirmation;
    uint256 numConfirmations;
    uint256 deadline;
    uint8 securityLevel;
}

/// @notice Each represent a level of security, which is the percentage of total owners to confirms a transaction in order to execute
/// @notice By default level1 is 50%, level2 is 80%, and level3 is 100%
struct PercentageOfEachSecurityLevel {
    uint8 level1;
    uint8 level2;
    uint8 level3;
}

/// @title A contract function as a multi-signature wallet
/// @notice You can use this contract for replacement for DAO version with trusted parties
/// @dev This contract ins't fully tested and auditted
contract MultiSigWallet {
    event Deposit(address indexed sender, uint256 amount, uint256 balance);
    event SubmitTransaction(
        address indexed owner,
        uint256 indexed txIndex,
        address indexed to,
        uint256 value,
        bytes data
    );
    event ConfirmTransaction(address indexed owner, uint256 indexed txIndex);
    event RevokeConfirmation(address indexed owner, uint256 indexed txIndex);
    event ExecuteTransaction(address indexed owner, uint256 indexed txIndex);
    event NewOwnerAdded(address indexed newOwner);
    event RemoveOwner(address indexed owner);
    event SecurityPercentageOfEachLevelChanged(uint8 level1Percentage, uint8 level2Percentage);
    event NewSubmitTransactionSecurityLevel(uint8 newValue);

    address[] public owners;
    uint256 immutable MAX_UINT = 2**256 - 1;
    mapping(address => bool) public isOwner;
    uint8 public newSubmitTransactionSecurityLevel = 1;
    /// @notice 0 means there is no limit for execute the contract
    uint256 public timeLimitForEachTransaction = 0;
    PercentageOfEachSecurityLevel public percentageOfEachLevel;

    // Mapping from tx index => owner => bool
    mapping(uint256 => mapping(address => bool)) public isConfirmed;

    // All transaction from this contract
    Transaction[] public transactions;

    modifier onlyOwner() {
        require(isOwner[msg.sender], "not owner");
        _;
    }

    modifier txExists(uint256 _txIndex) {
        require(_txIndex < transactions.length, "tx does not exist");
        _;
    }

    modifier notExecuted(uint256 _txIndex) {
        require(!transactions[_txIndex].executed, "tx already executed");
        _;
    }

    modifier notExpired(uint256 _txIndex) {
        require(transactions[_txIndex].deadline >= block.timestamp, "tx epxired");
        _;
    }

    modifier notConfirmed(uint256 _txIndex) {
        require(!isConfirmed[_txIndex][msg.sender], "tx already confirmed");
        _;
    }

    constructor(address[] memory _owners) {
        require(_owners.length > 0, "owners required");

        for (uint256 i = 0; i < _owners.length; i++) {
            address owner = _owners[i];

            require(owner != address(0), "invalid owner");
            require(!isOwner[owner], "owner not unique");

            isOwner[owner] = true;
            owners.push(owner);
        }

        percentageOfEachLevel = PercentageOfEachSecurityLevel({
            level1: 50,
            level2: 80,
            level3: 100
        });
    }

    receive() external payable {
        emit Deposit(msg.sender, msg.value, address(this).balance);
    }

    /// @notice This contract use fallback function as a way to modify authority state
    /// @dev Only authority_modify function could be executed here
    fallback() external payable {
        if (msg.sender == address(this)) {
            MultiSigCallBack memory multiSigCallback = abi.decode(msg.data, (MultiSigCallBack));
            if (multiSigCallback.functionType == MultiSigCallBackType.ADD_OWNER) {
                address newOwner = abi.decode(multiSigCallback.encodedData, (address));
                _addOwner(newOwner);
            } else if (multiSigCallback.functionType == MultiSigCallBackType.REMOVE_OWNER) {
                address owner = abi.decode(multiSigCallback.encodedData, (address));
                _removeOwner(owner);
            } else if (
                multiSigCallback.functionType ==
                MultiSigCallBackType.SECURITY_LEVEL_PERCENTAGE_CHANGE
            ) {
                (uint8 level1NewValue, uint8 level2NewValue) = abi.decode(
                    multiSigCallback.encodedData,
                    (uint8, uint8)
                );
                _changePercentageAtEachLevel(level1NewValue, level2NewValue);
            } else if (
                multiSigCallback.functionType ==
                MultiSigCallBackType.NEW_SUBMIT_TRANSACTION_SECURITYLEVEL_CHANGE
            ) {
                uint8 newValue = abi.decode(multiSigCallback.encodedData, (uint8));
                _changeNewSubmitTranscationSecurityLevel(newValue);
            } else if (
                multiSigCallback.functionType == MultiSigCallBackType.TIME_LIMIT_EACH_TRANS_CHANGE
            ) {
                uint256 newValue = abi.decode(multiSigCallback.encodedData, (uint256));
                _changeTimeLimitEachTransaction(newValue);
            }
        } else {
            console.log("Some one try to attack this contract by fallback");
        }
    }

    function _addOwner(address newOwner) private {
        owners.push(newOwner);
        isOwner[newOwner] = true;
    }

    function _removeOwner(address owner) private {
        uint256 removeOwnerIndex = owners.length;
        for (uint256 i = 0; i < owners.length; i++) {
            if (owner == owners[i]) {
                removeOwnerIndex = i;
                break;
            }
        }
        require(removeOwnerIndex != owners.length, "Want-to-remove address not found");
        address temp = owners[owners.length - 1];
        owners[owners.length - 1] = owner;
        owners[removeOwnerIndex] = temp;
        owners.pop();
        isOwner[owner] = false;
    }

    function _changePercentageAtEachLevel(uint8 newPercentageAtLevel1, uint8 newPercentageAtLevel2)
        private
    {
        percentageOfEachLevel.level1 = newPercentageAtLevel1;
        percentageOfEachLevel.level2 = newPercentageAtLevel2;
    }

    function _changeNewSubmitTranscationSecurityLevel(uint8 newValue) private {
        newSubmitTransactionSecurityLevel = newValue;
    }

    function _changeTimeLimitEachTransaction(uint256 newValue) private {
        timeLimitForEachTransaction = newValue;
    }

    function calculateConfirmationsNeeded(uint8 percentage, uint256 totalOwnersLength)
        public
        pure
        returns (uint256 confirmations)
    {
        uint256 div = (totalOwnersLength * percentage) / 100;
        uint256 mod = (totalOwnersLength * percentage) % 100;

        if (mod > 50) div = div + 1;

        if (div < 2 && totalOwnersLength > 2) {
            confirmations = 2;
        } else {
            confirmations = div;
        }
    }

    function _createNewTransaction(
        address _to,
        uint256 _value,
        bytes memory _data,
        bool autoExec,
        uint8 transactionSecurityLevel
    ) internal {
        uint256 txIndex = transactions.length;
        isConfirmed[txIndex][msg.sender] = true;
        transactions.push(
            Transaction({
                to: _to,
                value: _value,
                data: _data,
                executed: false,
                autoExecWhenEnoughConfirmation: autoExec,
                numConfirmations: 1,
                securityLevel: transactionSecurityLevel,
                deadline: (timeLimitForEachTransaction == 0)
                    ? MAX_UINT
                    : block.timestamp + timeLimitForEachTransaction
            })
        );
        emit SubmitTransaction(msg.sender, txIndex, _to, _value, _data);
    }

    /// @notice Submitted new transaction
    /// @notice These transaction later will be confirms by different owners
    /// @notice These are two kind of transaction, normal transaction and authority_modify transaction
    /// @notice This function is only work for create new normal transaction
    /// @dev For example, A transaction for transfer ERC20 from this contract to another wallet by using etherjs
    /// @dev const data = ERC20Contract.interface.encodeFunctionData("transfer", [anotherWallet, amount])
    /// @dev thisContract.submitTransaction(ERC20Contract.address, 0, data, true)
    function submitTransaction(
        address _to,
        uint256 _value,
        bytes memory _data,
        bool _autoExec
    ) public onlyOwner {
        require(_to != address(this), "Cannot submit authority_modify transaction by this way");
        _createNewTransaction(_to, _value, _data, _autoExec, newSubmitTransactionSecurityLevel);
    }

    /// @notice Confirming existed transaction
    /// @notice When enough confirmations according to the transaction security level,
    /// @notice it will automatic execute transaction depends on 'autoExecWhenEnoughConfirmation' value
    function confirmTransaction(uint256 _txIndex)
        public
        onlyOwner
        txExists(_txIndex)
        notExecuted(_txIndex)
        notConfirmed(_txIndex)
        notExpired(_txIndex)
    {
        Transaction storage transaction = transactions[_txIndex];
        transaction.numConfirmations += 1;
        isConfirmed[_txIndex][msg.sender] = true;
        emit ConfirmTransaction(msg.sender, _txIndex);
        // console.log("Tx: %s, security level: %s", _txIndex, transaction.securityLevel);
        if (
            transaction.autoExecWhenEnoughConfirmation &&
            (transaction.numConfirmations >=
                getComfirmationsNeededWithLevel(transaction.securityLevel))
        ) {
            executeTransaction(_txIndex);
        }
    }

    function executeTransaction(uint256 _txIndex)
        public
        onlyOwner
        txExists(_txIndex)
        notExecuted(_txIndex)
        notExpired(_txIndex)
    {
        Transaction storage transaction = transactions[_txIndex];

        require(
            transaction.numConfirmations >=
                getComfirmationsNeededWithLevel(transaction.securityLevel),
            "cannot execute tx"
        );

        transaction.executed = true;

        (bool success, ) = transaction.to.call{value: transaction.value}(transaction.data);
        require(success, "tx failed");

        emit ExecuteTransaction(msg.sender, _txIndex);
    }

    /// @notice Revoke an already confirm transaction
    function revokeConfirmation(uint256 _txIndex)
        public
        onlyOwner
        txExists(_txIndex)
        notExecuted(_txIndex)
    {
        Transaction storage transaction = transactions[_txIndex];

        require(isConfirmed[_txIndex][msg.sender], "tx not confirmed");

        transaction.numConfirmations -= 1;
        isConfirmed[_txIndex][msg.sender] = false;

        emit RevokeConfirmation(msg.sender, _txIndex);
    }

    function getOwners() public view returns (address[] memory) {
        return owners;
    }

    function getTransactionCount() public view returns (uint256) {
        return transactions.length;
    }

    function getComfirmationsNeededWithLevel(uint8 level)
        public
        view
        returns (uint256 confirmations)
    {
        require((level > 0 && level < 4), "Level must from 1 to 3");

        confirmations = calculateConfirmationsNeeded(
            (level == 1)
                ? percentageOfEachLevel.level1
                : ((level == 2) ? percentageOfEachLevel.level2 : percentageOfEachLevel.level3),
            owners.length
        );
    }

    function getTransaction(uint256 _txIndex)
        public
        view
        returns (
            address to,
            uint256 value,
            bytes memory data,
            bool executed,
            uint256 numConfirmations,
            uint8 transactionSecurityLevel
        )
    {
        Transaction storage transaction = transactions[_txIndex];

        return (
            transaction.to,
            transaction.value,
            transaction.data,
            transaction.executed,
            transaction.numConfirmations,
            transaction.securityLevel
        );
    }

    /// @notice An authority_modify function
    /// @notice This function corresponding to MultiSigCallBackType.ADD_OWNER
    /// @dev returns field should use for testing only and can be remove in pratical use
    function addOwners(address newOwner) external onlyOwner returns (bytes memory) {
        require(!isOwner[newOwner], "This address is already a owner");
        MultiSigCallBack memory callBack;
        callBack.functionType = MultiSigCallBackType.ADD_OWNER;
        callBack.encodedData = abi.encode(newOwner);
        bytes memory data = abi.encode(callBack);
        _createNewTransaction(address(this), 0, data, true, 3);
        return data;
    }

    /// @notice An authority_modify function
    /// @notice This function corresponding to MultiSigCallBackType.NEW_SUBMIT_TRANSACTION_SECURITYLEVEL_CHANGE
    /// @notice This will modify a default security value on creating normal transaction
    /// @dev returns field should use for testing only and can be remove in pratical use
    function setNewSubmitTransactionSecurityLevel(uint8 newLevel)
        external
        onlyOwner
        returns (bytes memory)
    {
        require(
            (newLevel > 0 && newLevel < 3 && newLevel != newSubmitTransactionSecurityLevel),
            "Level must from 1 to 3 and different from the old one"
        );
        MultiSigCallBack memory callBack;
        callBack.functionType = MultiSigCallBackType.NEW_SUBMIT_TRANSACTION_SECURITYLEVEL_CHANGE;
        callBack.encodedData = abi.encode(newLevel);
        bytes memory data = abi.encode(callBack);
        _createNewTransaction(address(this), 0, data, true, 3);
        return data;
    }

    /// @notice An authority_modify function
    /// @notice This function corresponding to MultiSigCallBackType.REMOVE_OWNER
    /// @notice This function need lv2 security in case of creating malicious transaction or lost
    /// @dev returns field should use for testing only and can be remove in pratical use
    function removeOwner(address oldOwner) external onlyOwner returns (bytes memory) {
        require(owners.length > 2, "Reached Minimum owners");
        require(isOwner[oldOwner], "Not Owner of this contract");
        MultiSigCallBack memory callBack;
        callBack.functionType = MultiSigCallBackType.REMOVE_OWNER;
        callBack.encodedData = abi.encode(oldOwner);
        bytes memory data = abi.encode(callBack);
        _createNewTransaction(address(this), 0, data, true, 2);
        return data;
    }

    /// @notice An authority_modify function
    /// @notice This function corresponding to MultiSigCallBackType.REMOVE_OWNER
    /// @notice This will modify a percentage of lv1, lv2 security
    /// @dev returns field should use for testing only and can be remove in pratical use
    function changePercentageNeededInSecurityLevel(
        uint8 level1PercentageChange,
        uint8 level2PercentageChange
    ) external onlyOwner returns (bytes memory) {
        require(
            level1PercentageChange < level2PercentageChange && level1PercentageChange > 0,
            "Not as correct format"
        );
        require(level2PercentageChange < 100, "Not as correct format");
        MultiSigCallBack memory callBack;
        callBack.functionType = MultiSigCallBackType.SECURITY_LEVEL_PERCENTAGE_CHANGE;
        callBack.encodedData = abi.encode(level1PercentageChange, level2PercentageChange);
        bytes memory data = abi.encode(callBack);
        _createNewTransaction(address(this), 0, data, true, 3);
        return data;
    }

    /// @notice An authority_modify function
    /// @notice This function corresponding to MultiSigCallBackType.REMOVE_OWNER
    /// @dev returns field should use for testing only and can be remove in pratical use
    function changeTimeLimitForEachTransaction(uint256 limitTime)
        external
        onlyOwner
        returns (bytes memory)
    {
        MultiSigCallBack memory callBack;
        callBack.functionType = MultiSigCallBackType.TIME_LIMIT_EACH_TRANS_CHANGE;
        callBack.encodedData = abi.encode(limitTime);
        bytes memory data = abi.encode(callBack);
        _createNewTransaction(address(this), 0, data, true, 2);
        return data;
    }
}
